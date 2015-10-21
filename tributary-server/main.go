package main

import (
	"flag"
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
)

type CommandHandlerFunc func(conn *websocket.Conn, message map[string]interface{})

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
		"BROADCAST": commandBroadcast,
	}
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
			conn.Close()
			return
		}

		command, ok := messageObject["command"].(string)
		if !ok {
			errorMessage := "Message is lacking a command property"
			log.Println(errorMessage)
			sendErrorMessage(conn, errorMessage)
			conn.Close()
			return
		}

		log.Printf("Received command: %v\n", command)
		if commandHandler, ok := commandHandlers[command]; ok {
			commandHandler(conn, messageObject)
		} else {
			errorMessage := fmt.Sprintf("Unknown command: %v", command)
			log.Printf(errorMessage)
			sendErrorMessage(conn, errorMessage)
			conn.Close()
			return
		}
	}
}

func commandBroadcast(conn *websocket.Conn, message map[string]interface{}) {
	fmt.Println("broadacast!")
}

func sendErrorMessage(conn *websocket.Conn, message string) {
	conn.WriteJSON(struct {
		Message string `json:"message"`
	}{message})
	conn.Close()
}

func sendErrorMessageAndCode(conn *websocket.Conn, message string, errorCode int) {
	conn.WriteJSON(struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	}{
		message,
		errorCode,
	})
	conn.Close()
}
