// Entry point for Nakama JS runtime
// Nakama requires this file as the --runtime.js_entrypoint

// Load the tictactoe module — InitModule is called automatically by Nakama
// when it finds a function named InitModule in the loaded scripts.
// Since Nakama concatenates all JS files in the modules folder,
// we just need this file to exist as the declared entrypoint.

var logger = null; // placeholder — Nakama injects runtime globals
