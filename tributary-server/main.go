package main

import (
	"flag"
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/satori/go.uuid"
	"log"
	"net/http"
)

type CommandHandlerFunc func(conn *websocket.Conn, id string, message map[string]interface{})
type TreeNode struct {
	conn     *websocket.Conn
	id       string
	children []*TreeNode
	parent   *TreeNode
}

var (
	port         = flag.Int("port", 8081, "Port the server listens on")
	maxListeners = flag.Int("max-listeners", 3, "Max number of listeners (WebRTC peers) for a single client")
	upgrader     = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	commandHandlers = map[string]CommandHandlerFunc{
		"START_BROADCAST":          commandStartBroadcast,
		"JOIN_BROADCAST":           commandJoinBroadcast,
		"RELAY_BROADCAST_RECEIVED": commandRelayBroadCastReceived,
		"ICE_CANDIDATES":           commandIceCandidates,
		"ICE_CANDIDATES_RECEIVED":  commandIceCandidatesReceived,
	}
	broadcasts  = map[string]*TreeNode{}
	connections = map[string]*websocket.Conn{}
)

func main() {
	http.HandleFunc("/api/ws", handleWebSocket)
	log.Println("Server starting on port", *port)
	log.Fatal("ListenAndServe:", http.ListenAndServe(fmt.Sprintf(":%d", *port), nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	log.Println("Incoming", r.Method, "message")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Failed to upgrade:", err)
		return
	}

	id := uuid.NewV4().String()

	for {
		var rawMessage interface{}
		if err := conn.ReadJSON(&rawMessage); err != nil {
			log.Printf("Read error: %v\n", err)
			conn.Close()
			return
		}

		messageObject, ok := rawMessage.(map[string]interface{})
		if !ok {
			sendErrorMessage(conn, "Message is not a JSON object")
			continue
		}

		command, ok := messageObject["command"].(string)
		if !ok {
			sendErrorMessage(conn, "Message is lacking a command property")
			continue
		}

		log.Printf("Received command: %v\n", command)
		if commandHandler, ok := commandHandlers[command]; ok {
			commandHandler(conn, id, messageObject)
		} else {
			sendErrorMessage(conn, fmt.Sprintf("Unknown command: %v", command))
			continue
		}
	}
}

func commandStartBroadcast(conn *websocket.Conn, id string, message map[string]interface{}) {
	if name, ok := stringProp(message, "name"); ok {
		log.Printf("Starting broadcast: %v", name)
		broadcasts[name] = &TreeNode{
			conn: conn,
			id:   id,
		}
		connections[id] = conn
		conn.WriteJSON(struct {
			Command string `json:"command"`
		}{
			"START_BROADCAST_RECEIVED",
		})
		return
	}

	sendErrorMessage(conn, "No \"name\" property not specified or not a string in START_BROADCAST message")
}

func commandJoinBroadcast(conn *websocket.Conn, id string, message map[string]interface{}) {
	var name string
	var offer map[string]interface{}
	var ok bool

	if name, ok = stringProp(message, "name"); !ok {
		sendErrorMessage(conn, "No \"name\" property not specified or not a string in JOIN_BROADCAST message")
	}

	if offer, ok = objectProp(message, "offer"); !ok {
		sendErrorMessage(conn, "No \"offer\" property not specified or not an object in JOIN_BROADCAST message")
	}

	if broadcast, ok := broadcasts[name]; ok {

		// FIXME: need to actually build a proper tree and insert this new connection into the right place.
		// For now everyone just connects directly to the broadcaster.
		parent := broadcast
		node := TreeNode{
			conn:   conn,
			id:     id,
			parent: parent,
		}
		connections[id] = conn

		parent.children = append(node.parent.children, &node)
		parent.conn.WriteJSON(struct {
			Command string                 `json:"command"`
			Peer    string                 `json:"peer"`
			Offer   map[string]interface{} `json:"offer"`
		}{
			"RELAY_BROADCAST",
			id,
			offer,
		})
		return
	}

	sendErrorMessage(conn, fmt.Sprintf("Unknown broadcast: %v", name))
}

func commandRelayBroadCastReceived(conn *websocket.Conn, id string, message map[string]interface{}) {
	var peer string
	var answer map[string]interface{}
	var ok bool

	if peer, ok = stringProp(message, "peer"); !ok {
		sendErrorMessage(conn, "No \"peer\" property not specified or not a string in RELAY_BROADCAST_RECEIVED message")
	}

	if answer, ok = objectProp(message, "answer"); !ok {
		sendErrorMessage(conn, "No \"answer\" property not specified or not an object in RELAY_BROADCAST_RECEIVED message")
	}

	if peerConnection, ok := connections[peer]; ok {
		peerConnection.WriteJSON(struct {
			Command string                 `json:"command"`
			Peer    string                 `json:"peer"`
			Answer  map[string]interface{} `json:"answer"`
		}{
			"JOIN_BROADCAST_RECEIVED",
			id,
			answer,
		})
		return
	}

	sendErrorMessage(conn, fmt.Sprintf("Unknown peer: %v", peer))
}

func commandIceCandidates(conn *websocket.Conn, id string, message map[string]interface{}) {
	var peer string
	var candidates []interface{}
	var ok bool

	if peer, ok = stringProp(message, "peer"); !ok {
		sendErrorMessage(conn, "No \"peer\" property not specified or not a string in ICE_CANDIDATE message")
	}

	if candidates, ok = arrayProp(message, "candidates"); !ok {
		sendErrorMessage(conn, "No \"candidates\" property not specified or not an array in ICE_CANDIDATE message")
	}

	if peerConnection, ok := connections[peer]; ok {
		peerConnection.WriteJSON(struct {
			Command    string        `json:"command"`
			Peer       string        `json:"peer"`
			Candidates []interface{} `json:"candidates"`
		}{
			"ICE_CANDIDATES",
			id,
			candidates,
		})
		return
	}

	sendErrorMessage(conn, fmt.Sprintf("Unknown peer: %v", peer))
}

func commandIceCandidatesReceived(conn *websocket.Conn, id string, message map[string]interface{}) {
	if peer, ok := stringProp(message, "peer"); ok {
		if peerConnection, ok := connections[peer]; ok {
			peerConnection.WriteJSON(struct {
				Command string `json:"command"`
				Peer    string `json:"peer"`
			}{
				"ICE_CANDIDATES_RECEIVED",
				id,
			})
			return
		}

		sendErrorMessage(conn, fmt.Sprintf("Unknown peer: %v", peer))
	} else {
		sendErrorMessage(conn, "No \"peer\" property not specified or not a string in ICE_CANDIDATE message")
	}
}

func sendErrorMessage(conn *websocket.Conn, message string) {
	log.Println(message)
	conn.WriteJSON(struct {
		Message string `json:"message"`
	}{message})
}

func sendErrorMessageAndCode(conn *websocket.Conn, message string, errorCode int) {
	log.Println(message)
	conn.WriteJSON(struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	}{
		message,
		errorCode,
	})
}
