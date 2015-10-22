package main

func stringProp(message map[string]interface{}, name string) (string, bool) {
	if rawValue, ok := message[name]; ok {
		if value, ok := rawValue.(string); ok {
			return value, true
		}
	}

	return "", false
}

func objectProp(message map[string]interface{}, name string) (map[string]interface{}, bool) {
	if rawValue, ok := message[name]; ok {
		if value, ok := rawValue.(map[string]interface{}); ok {
			return value, true
		}
	}

	return map[string]interface{}{}, false
}

func arrayProp(message map[string]interface{}, name string) ([]interface{}, bool) {
	if rawValue, ok := message[name]; ok {
		if value, ok := rawValue.([]interface{}); ok {
			return value, true
		}
	}

	return []interface{}{}, false
}
