#!/usr/bin/python3
import cv2
import json
import mediapipe as mp
import websockets
import asyncio
import signal
import sys

mp_hands = mp.solutions.hands

cap = cv2.VideoCapture(0)

palm_standard_hor = 71.0466227224837
palm_standard_vert = 100.03117166580984

# стандартные параметры в vr
z_standard = 50
hor_standard_palm = 6
vert_standard_palm = 8

global is_calibrated
global is_first_calibration

async def send_one_position(websocket, path):

    is_calibrated = False
    is_first_calibration = True

    with mp_hands.Hands(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5) as hands:

        while cap.isOpened():
            success, image = cap.read()
            if not success:
                print("Ignoring empty camera frame.")
                continue

            image = cv2.cvtColor(cv2.flip(image, -1), cv2.COLOR_BGR2RGB)

            image.flags.writeable = False

            results = hands.process(image)

            image_height, image_width, _ = image.shape

            x = []
            y = []
            z = []

            if not is_calibrated:
                data = {
                    'x21': 0,
                    'y21': 0,
                    'z21': 0,
                    'isClenched': 0
                }

            if results.multi_hand_landmarks != None:
                for handLandmarks in results.multi_hand_landmarks:
                    for point in mp_hands.HandLandmark:
                        normalized_landmark = handLandmarks.landmark[point]

                        x.append(normalized_landmark.x)
                        y.append(normalized_landmark.y)
                        z.append(normalized_landmark.z)

                # в пикселях
                palm_vert = (((x[9] - x[0]) * image_width) ** 2 + ((y[9] - y[0]) * image_height) ** 2) ** 0.5
                palm_hor = (((x[17] - x[5]) * image_width) ** 2 + ((y[17] - y[5]) * image_height) ** 2) ** 0.5

                if not is_calibrated:

                    # относительно размеров изображения
                    p_vert = ((x[9] - x[0]) ** 2 + (y[9] - y[0]) ** 2) ** 0.5
                    p_hor = ((x[17] - x[5]) ** 2 + (y[17] - y[5]) ** 2) ** 0.5

                    if (0.2 <= p_vert <= 0.21) or (0.1 <= p_hor <= 0.11):
                        palm_standard_hor = palm_hor
                        palm_standard_vert = palm_vert
                        is_calibrated = True
                        print("Successfully calibrated")
                    elif (p_vert < 0.2) or (p_hor < 0.1):
                        print("Closer")
                        continue
                    elif (p_vert > 0.22) or (p_hor > 0.12):
                        print("Farther")
                        continue

                if palm_vert >= palm_hor:
                    z_palm = palm_standard_vert * z_standard / palm_vert
                    pix = vert_standard_palm / palm_vert
                else:
                    z_palm = palm_standard_hor * z_standard / palm_hor
                    pix = hor_standard_palm / palm_hor


                coords_vr_x = []
                coords_vr_y = []
                coords_vr_z = []

                for i in range(21):
                    xi = pix * x[i] * image_width
                    yi = pix * y[i] * image_height
                    zi = pix * z[i] * image_width
                    coords_vr_x.append(xi)
                    coords_vr_y.append(yi)
                    coords_vr_z.append(zi)
                
                
                x_max = max(coords_vr_x)
                x_min = min(coords_vr_x)

                y_max = max(coords_vr_y)
                y_min = min(coords_vr_y)

                if is_first_calibration:
                    y_open_palm_len= y_max - y_min
                    x_open_palm_len= x_max - x_min

                    square_open_palm = y_open_palm_len * x_open_palm_len
                    square_close_palm = square_open_palm * 0.7

                    is_first_calibration = False
                
                is_clenched = 0
                if square_close_palm > (x_max - x_min) * (y_max - y_min):
                    is_clenched = 1

                x_centre_cube = (x_max + x_min) / 2
                y_centre_cube = (y_max + y_min) / 2

                data = {
                    'x21': x_centre_cube,
                    'y21': y_centre_cube,
                    'z21': z_palm,
                    'isClenched': is_clenched # 0 - open, 1 - close
                }

                for i in range(21):
                    data['x' + str(i)] = coords_vr_x[i]
                    data['y' + str(i)] = coords_vr_y[i]
                    data['z' + str(i)] = coords_vr_z[i] + z_palm


            try:
                print("Sent: ", data)
                await websocket.send(json.dumps(data))

            except websockets.ConnectionClosed:
                cap.release()
                print("Client disconnected")


async def main():
    server = await websockets.serve(send_one_position, "localhost", 8000)
    print("WebSocket server started on ws://localhost:8000")
    

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown(server)))
    
    await server.wait_closed()

async def shutdown(server):
    print("Shutting down server...")
    server.close()
    await server.wait_closed()
    print("Server shut down complete.")
    sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())