#!/usr/bin/python3
import asyncio
import json
import websockets
import signal
import sys

connected_clients = set()


def is_inside_box(cube, box):
    return (box['x_min'] <= cube['x'] <= box['x_max'] and
            box['y_min'] <= cube['y'] <= box['y_max'] and
            box['z_min'] <= cube['z'] <= box['z_max'])


async def handle_connection(websocket, path):
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)

            cube = {
                'id': data['id'],
                'x': data['x'],
                'y': data['y'],
                'z': data['z']
            }

            wire_box_0 = {
                'id': 0,
                'x_min': 0, 'x_max': 2,
                'y_min': 0.2, 'y_max': 2.2,
                'z_min': 1.5, 'z_max': 2.5
            }

            wire_box_1 = {
                'id': 1,
                'x_min': 2, 'x_max': 4,
                'y_min': 0.2, 'y_max': 2.2,
                'z_min': 1.5, 'z_max': 2.5
            }

            inside_wire_box_0 = is_inside_box(cube, wire_box_0)
            inside_wire_box_1 = is_inside_box(cube, wire_box_1)

            """ response = {
                'id': cube['id'],
                'inside_box_0': inside
            }

            await websocket.send(json.dumps(response)) """

            print(
                f"Received: ID={data['id']}, X={data['x']}, Y={data['y']}, Z={data['z']}")
            print(
                f"Cube {cube['id']} is {'inside' if inside_wire_box_0 else 'outside'} the wire_box_0")
            print(
                f"Cube {cube['id']} is {'inside' if inside_wire_box_1 else 'outside'} the wire_box_1")
    except websockets.ConnectionClosed:
        print("Client disconnected")
    finally:
        connected_clients.remove(websocket)


async def main():
    server = await websockets.serve(handle_connection, "localhost", 8001)
    print("WebSocket server started on ws://localhost:8001")

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(
            sig, lambda: asyncio.create_task(shutdown(server)))

    await server.wait_closed()


async def shutdown(server):
    print("Shutting down server...")
    server.close()
    await server.wait_closed()
    print("Server shut down complete.")
    sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
