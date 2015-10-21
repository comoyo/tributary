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
	port     = flag.Int("port", 8080, "Port the server listens on")
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	commandHandlers = map[string]CommandHandlerFunc{
		"BROADCAST": commandBroadcast,
	}
)

func main() {
	http.HandleFunc("/api/ws", handleWebSocket)
	log.Fatal("ListenAndServe:", http.ListenAndServe(fmt.Sprintf(":%d", *port), nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
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
		message string `json:"message"`
		code    int    `json:"code"`
	}{
		message: message,
		code:    errorCode,
	})
	conn.Close()
}
