import asyncio
import json
import websockets
import signal
import sys

connected_clients = set()


async def handle_connection(websocket, path):
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            print(
                f"Received: ID={data['id']}, X={data['x']}, Y={data['y']}, Z={data['z']}")
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
