const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const {
	NEW_MESSAGE,
	NEW_USER,
	USER_LEFT,
	ACTIVE_ROOM
} = require('./constants');

const port = 3001;

server.listen(port, () => console.log(`Listening on *:${port}`));

// Routing
app.use(express.static(path.join(__dirname, '../build')));

// Active users
let active = 0;

const rooms = ['General', 'Room #1'];

// Chat
io.on('connection', socket => {
	const commands = {
		'/enter': (...args) => {
			const room = args.join(' ');
			rooms.push(room);
			socket.emit(ACTIVE_ROOM, { active: room, rooms });
			socket.broadcast.emit(ACTIVE_ROOM, { rooms });
			console.log(`Entering room ${room} - ${JSON.stringify(rooms)}`);
		}
	};

	const systemMessage = (message, room = rooms[0]) => {
		const data = {
			room,
			username: 'system',
			message: message
		};

		socket.emit(NEW_MESSAGE, data);
		socket.broadcast.emit(NEW_MESSAGE, data);
	};

	const runCommand = ({ message, room }) => {
		const args = message.split(' ');
		const command = args.shift();

		if (!(command in commands)) {
			return systemMessage(`Command ${command} doesn't exists, \ncome on!`, room);
		}

		console.log(`Executing command: ${command} with ${JSON.stringify(args)}`);

		return commands[command].apply(null, args);
 	};

	/**
	 * Listener for new messages
	 */
	socket.on(NEW_MESSAGE, data => {
		console.log(`${NEW_MESSAGE}: ${JSON.stringify(data)}`);

		if (data.message.charAt(0) === '/') {
			return runCommand(data);
		}

		socket.emit(NEW_MESSAGE, data);
		socket.broadcast.emit(NEW_MESSAGE, data);
	});

	/**
	 * Listener for disconnection/left
	 */
	socket.on(USER_LEFT, data => {
		if (!data || !data.username) {
			return;
		}

		console.log(`${USER_LEFT}: ${JSON.stringify(data)}`);

		active--;

		socket.broadcast.emit(USER_LEFT, {
			username: data.username,
			active
		});

		systemMessage(`${data.username} left!`);
	});

	/**
	 * Listener for new users
	 */
	socket.on(NEW_USER, username => {
		active++;

		socket.emit(NEW_USER, { active, rooms });
		socket.broadcast.emit(NEW_USER, { active, rooms });

		systemMessage(`New user entered the chat: ${username}`);

		console.log(`${NEW_USER}: ${username} - ${active}`);
	});
});