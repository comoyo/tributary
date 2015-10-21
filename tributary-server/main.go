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
	conn *websocket.Conn
	id   string
}

var (
	port     = flag.Int("port", 8081, "Port the server listens on")
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	commandHandlers = map[string]CommandHandlerFunc{
		"START_BROADCAST": commandStartBroadcast,
	}
	broadcasts = map[string]TreeNode{}
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
			errorMessage := "Message is not a JSON object"
			log.Println(errorMessage)
			sendErrorMessage(conn, errorMessage)
			continue
		}

		command, ok := messageObject["command"].(string)
		if !ok {
			errorMessage := "Message is lacking a command property"
			log.Println(errorMessage)
			sendErrorMessage(conn, errorMessage)
			continue
		}

		log.Printf("Received command: %v\n", command)
		if commandHandler, ok := commandHandlers[command]; ok {
			commandHandler(conn, id, messageObject)
		} else {
			errorMessage := fmt.Sprintf("Unknown command: %v", command)
			log.Printf(errorMessage)
			sendErrorMessage(conn, errorMessage)
			continue
		}
	}
}

func commandStartBroadcast(conn *websocket.Conn, id string, message map[string]interface{}) {
	if name, ok := stringProp(message, "name"); ok {
		broadcasts[name] = TreeNode{
			conn,
			id,
		}

		conn.WriteJSON(struct {
			Command string `json:"command"`
		}{
			"START_BROADCAST_RECEIVED",
		})
		return
	}

	errorMessage := "No \"name\" property not specified or not a string in START_BROADCAST message"
	log.Printf(errorMessage)
	sendErrorMessage(conn, errorMessage)
}

func stringProp(message map[string]interface{}, name string) (string, bool) {
	if rawValue, ok := message[name]; ok {
		if value, ok := rawValue.(string); ok {
			return value, true
		}
	}

	return "", false
}

func sendErrorMessage(conn *websocket.Conn, message string) {
	conn.WriteJSON(struct {
		Message string `json:"message"`
	}{message})
}

func sendErrorMessageAndCode(conn *websocket.Conn, message string, errorCode int) {
	conn.WriteJSON(struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	}{
		message,
		errorCode,
	})
}
