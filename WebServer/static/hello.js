document.addEventListener("DOMContentLoaded", function () {
  var shift = { x: 0, y: 0.3, z: 0 };
  var scene = document.querySelector("a-scene");
  plotAxes(shift);
  screenSurf(shift);

  var selectedBoxId = null;
  var isMoving = false;
  var moveSpeed = 0.5;

  var websocket = new WebSocket("ws://localhost:8000");

  var websocketForSendCoords = new WebSocket("ws://localhost:8001");

  websocket.onmessage = function (event) {
    redata(JSON.parse(event.data));
  };

  websocketForSendCoords.onmessage = function (event) {
    try {
      var data = JSON.parse(event.data);

      if (data.inside_box_0 || data.inside_box_1) {
        if (data.inside_box_0) {
          showNotification(`Куб с ID ${data.id} попал внутрь первого объекта!`);
        } else {
          showNotification(`Куб с ID ${data.id} попал внутрь второго объекта!`);
        }
      }
    } catch (e) {
      console.error("Ошибка обработки данных:", e);
    }
  };

  function showNotification(message) {
    var notification = document.getElementById("notification");
    notification.textContent = message;
    notification.style.display = "block";

    setTimeout(function () {
      notification.style.display = "none";
    }, 7000);
  }

  createWireframeCube(1, 0.2, 2.5);
  createWireframeCube(3, 0.2, 2.5);

  var box_id = 0;
  var boxes = [];
  var flag = false;
  var index = -1;

  var selectedShape = "box";
  var initialPositionSet = false;

  var cameraIsSet = false;
  var accuracy = 0;
  camPos = { x: 0, y: 0, z: 0 };

  var position = { x: 0, y: 0, z: 0 };

  var connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4], // thumb
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8], // index finger
    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12], // middle finger
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16], // ring finger
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20], // pinky
    [5, 9],
    [9, 13],
    [13, 17],
  ];

  var showLabels = false; // Переменная для управления показом/скрытием надписей

  function createWireframeCube(deltaX, deltaY, deltaZ) {
    var cubeEdges = [
      [
        { x: -1 + deltaX, y: 0 + deltaY, z: -1 + deltaZ },
        { x: 1 + deltaX, y: 0 + deltaY, z: -1 + deltaZ },
      ],
      [
        { x: 1 + deltaX, y: 0 + deltaY, z: -1 + deltaZ },
        { x: 1 + deltaX, y: 0 + deltaY, z: 1 + deltaZ },
      ],
      [
        { x: 1 + deltaX, y: 0 + deltaY, z: 1 + deltaZ },
        { x: -1 + deltaX, y: 0 + deltaY, z: 1 + deltaZ },
      ],
      [
        { x: -1 + deltaX, y: 0 + deltaY, z: 1 + deltaZ },
        { x: -1 + deltaX, y: 0 + deltaY, z: -1 + deltaZ },
      ],
      [
        { x: -1 + deltaX, y: 2 + deltaY, z: -1 + deltaZ },
        { x: 1 + deltaX, y: 2 + deltaY, z: -1 + deltaZ },
      ],
      [
        { x: 1 + deltaX, y: 2 + deltaY, z: -1 + deltaZ },
        { x: 1 + deltaX, y: 2 + deltaY, z: 1 + deltaZ },
      ],
      [
        { x: 1 + deltaX, y: 2 + deltaY, z: 1 + deltaZ },
        { x: -1 + deltaX, y: 2 + deltaY, z: 1 + deltaZ },
      ],
      [
        { x: -1 + deltaX, y: 2 + deltaY, z: 1 + deltaZ },
        { x: -1 + deltaX, y: 2 + deltaY, z: -1 + deltaZ },
      ],
      [
        { x: -1 + deltaX, y: 0 + deltaY, z: -1 + deltaZ },
        { x: -1 + deltaX, y: 2 + deltaY, z: -1 + deltaZ },
      ],
      [
        { x: 1 + deltaX, y: 0 + deltaY, z: -1 + deltaZ },
        { x: 1 + deltaX, y: 2 + deltaY, z: -1 + deltaZ },
      ],
      [
        { x: 1 + deltaX, y: 0 + deltaY, z: 1 + deltaZ },
        { x: 1 + deltaX, y: 2 + deltaY, z: 1 + deltaZ },
      ],
      [
        { x: -1 + deltaX, y: 0 + deltaY, z: 1 + deltaZ },
        { x: -1 + deltaX, y: 2 + deltaY, z: 1 + deltaZ },
      ],
    ];

    cubeEdges.forEach((edge, index) => {
      var lineEl = document.createElement("a-entity");
      lineEl.setAttribute("id", "cube_edge_" + index);
      lineEl.setAttribute("line", {
        start: `${edge[0].x} ${edge[0].y} ${edge[0].z}`,
        end: `${edge[1].x} ${edge[1].y} ${edge[1].z}`,
        color: "#FFFFFF",
        width: 0.1,
      });
      scene.appendChild(lineEl);
    });
  }

  function redata(data) {
    if (data !== null) {
      var points = [];

      requestAnimationFrame(() => {
        for (var i = 0; i < 22; i++) {
          if (
            data["x" + i] !== undefined &&
            data["y" + i] !== undefined &&
            data["z" + i] !== undefined
          ) {
            let x = parseInt(data["x" + i], 10) / 10 + shift.x;
            let y = parseInt(data["y" + i], 10) / 10 + shift.y;
            let z = parseInt(data["z" + i], 10) / 10 + shift.z;

            position.x = x;
            position.y = y;
            position.z = z;

            points.push({ x, y, z });

            if (!cameraIsSet) {
              if (accuracy < 10) {
                camPos.x += position.x;
                camPos.y += position.y;
                camPos.z += position.z;
                accuracy += 1;
                continue;
              } else {
                camPos.x = camPos.x / accuracy + 2;
                camPos.y = camPos.y / accuracy - 2;
                camPos.z = camPos.z / accuracy + 3;

                cameraIsSet = true;
                var cam = document.getElementById("cam");
                cam.setAttribute("position", camPos);

                var plane = document.getElementById("screen");
                var textS = document.getElementById("textScreen");

                plane.setAttribute("position", {
                  x: camPos.x,
                  y: 5 + shift.y,
                  z: shift.z,
                });
                textS.setAttribute("position", {
                  x: camPos.x,
                  y: 5 + shift.y,
                  z: shift.z + 0.1,
                });
              }
            }

            if (!initialPositionSet) {
              x = camPos.x;
              y += camPos.y;
              initialPositionSet = true;
            }

            var entity = document.getElementById("parent_id" + i);
            if (entity) {
              entity.object3D.position.set(x, y, z);
            } else {
              createPoint(i, x, y, z);
            }

            var text = document.getElementById("text_id" + i);
            if (text) {
              if (showLabels) {
                text.setAttribute(
                  "value",
                  "id=" +
                    i +
                    " (" +
                    parseInt(data["x" + i], 10) +
                    "," +
                    parseInt(data["y" + i], 10) +
                    "," +
                    parseInt(data["z" + i], 10) +
                    ")"
                );
              } else {
                text.setAttribute("value", "");
              }
            }

            if (i === 21 && isMoving && selectedBoxId !== null) {
              moveBoxToPoint(selectedBoxId, x, y, z);
            }
          }
        }

        for (var j = 0; j < connections.length; j++) {
          var start = connections[j][0];
          var end = connections[j][1];

          var lineId = "line_" + start + "_" + end;
          var lineEl = document.getElementById(lineId);

          if (lineEl) {
            lineEl.setAttribute("line", {
              start: `${points[start].x} ${points[start].y} ${points[start].z}`,
              end: `${points[end].x} ${points[end].y} ${points[end].z}`,
              color: "#00FF00",
              width: 0.2,
            });
          } else {
            createLine(lineId, points[start], points[end]);
          }
        }
      });

      if (data["isClenched"] !== undefined) {
        if (data["isClenched"]) {
          if (!isMoving) {
            selectBox();
          }
          isMoving = true;
        } else {
          isMoving = false;
          selectedBoxId = null;
        }
      }
    }
  }

  function createPoint(i, x, y, z) {
    var entity = document.createElement("a-entity");
    entity.setAttribute("id", "parent_id" + i);
    entity.setAttribute("position", `${x} ${y} ${z}`);

    var sphere = document.createElement("a-sphere");
    sphere.setAttribute("radius", i < 21 ? "0.0375" : "0.075");
    sphere.setAttribute("color", i < 21 ? "#483D8B" : "#FF0000");
    sphere.setAttribute("position", "0 0 0");

    var text = document.createElement("a-text");
    text.setAttribute("id", "text_id" + i);
    text.setAttribute("value", "");
    text.setAttribute("color", "#FFFFFF");
    text.setAttribute("position", "0.125 0 0");

    entity.appendChild(sphere);
    entity.appendChild(text);

    scene.appendChild(entity);
  }

  function createLine(id, start, end) {
    var lineEl = document.createElement("a-entity");
    lineEl.setAttribute("id", id);
    lineEl.setAttribute("line", {
      start: `${start.x} ${start.y} ${start.z}`,
      end: `${end.x} ${end.y} ${end.z}`,
      color: "#00FF00",
      width: 0.2,
    });
    scene.appendChild(lineEl);
  }

  function createBox() {
    var boxEl;
    if (selectedShape === "box") {
      boxEl = document.createElement("a-box");
      boxEl.setAttribute("material", {
        color: "#0ebeff",
      });
    } else if (selectedShape === "sphere") {
      boxEl = document.createElement("a-sphere");
      boxEl.setAttribute("material", {
        color: "#ae63e4",
      });
      boxEl.setAttribute("radius", 0.5);
    }
    boxEl.setAttribute("position", position);
    boxEl.setAttribute("id", "box_" + box_id);

    // Создаем текстовый элемент для отображения координат
    var textEl = document.createElement("a-text");
    textEl.setAttribute("id", "text_box_" + box_id);
    textEl.setAttribute(
      "value",
      `(${position.x.toFixed(2)}, ${position.y.toFixed(
        2
      )}, ${position.z.toFixed(2)})`
    );
    textEl.setAttribute("color", "#FFFFFF");
    textEl.setAttribute("position", {
      x: position.x + 0.5,
      y: position.y + 0.5,
      z: position.z,
    });

    scene.appendChild(boxEl);
    scene.appendChild(textEl);

    boxes["box_" + box_id] = [position.x, position.y, position.z];
    sendBoxCoordinates("box_" + box_id, position.x, position.y, position.z);
    box_id++;
    console.log(boxes);
  }

  function selectBox() {
    var mas = [position.x, position.y, position.z];

    for (var i = 0; i < box_id; i++) {
      var selected = true;
      for (var j = 0; j < 3; j++) {
        if (
          boxes["box_" + i][j] >= mas[j] + 0.5 ||
          boxes["box_" + i][j] <= mas[j] - 0.5
        ) {
          selected = false;
          break;
        }
      }

      if (selected) {
        selectedBoxId = "box_" + i;
        break;
      }
    }
  }

  function moveBoxToPoint(boxId, targetX, targetY, targetZ) {
    var box = document.getElementById(boxId);
    var textEl = document.getElementById("text_" + boxId);
    if (box) {
      var currentPosition = box.object3D.position;
      var newX = currentPosition.x + (targetX - currentPosition.x) * moveSpeed;
      var newY = currentPosition.y + (targetY - currentPosition.y) * moveSpeed;
      var newZ = currentPosition.z + (targetZ - currentPosition.z) * moveSpeed;

      box.object3D.position.set(newX, newY, newZ);
      boxes[boxId] = [newX, newY, newZ];

      // Обновляем текст с координатами
      if (textEl) {
        textEl.setAttribute("position", {
          x: newX + 0.5,
          y: newY + 0.5,
          z: newZ,
        });
        textEl.setAttribute(
          "value",
          `(${newX.toFixed(2)}, ${newY.toFixed(2)}, ${newZ.toFixed(2)})`
        );
      }

      sendBoxCoordinates(boxId, newX, newY, newZ);
    }
  }

  function sendBoxCoordinates(boxId, x, y, z) {
    if (websocketForSendCoords.readyState === WebSocket.OPEN) {
      websocketForSendCoords.send(
        JSON.stringify({ id: boxId, x: x, y: y, z: z })
      );
    }
  }

  function updateBox() {
    boxes["box_" + index] = [position.x, position.y, position.z];
    flag = false;
    index = -1;
  }

  document.addEventListener("keydown", function (event) {
    if (event.code === "Digit1") {
      selectedShape = "box";
      console.log("Selected shape: Box");
    } else if (event.code === "Digit2") {
      selectedShape = "sphere";
      console.log("Selected shape: Sphere");
    }

    if (event.code === "Space") {
      createBox();
    }

    if (event.code === "KeyQ") {
      selectBox();
    }

    if (event.code === "KeyE") {
      updateBox();
    }

    if (event.code === "KeyR") {
      showLabels = !showLabels; // Переключение состояния надписей
    }
  });
  x;

  function screenSurf(shift) {
    var plane = document.getElementById("screen");
    plane.setAttribute("height", 10);
    plane.setAttribute("width", 10);
    plane.setAttribute("position", {
      x: 5 + shift.x,
      y: 5 + shift.y,
      z: shift.z,
    });
    var textS = document.getElementById("textScreen");
    textS.setAttribute("position", {
      x: 5 + shift.x,
      y: 5 + shift.y,
      z: shift.z + 0.1,
    });
    textS.setAttribute("text", {
      value: "screen",
      color: "black",
      align: "center",
      width: 20,
      opacity: 0.4,
    });
  }

  function plotAxes(shift) {
    for (var i = 0; i < 100; i++) {
      if (i == 0) {
        var boxEl = document.createElement("a-sphere");
        boxEl.setAttribute("material", { color: "#ae63e4" });
        boxEl.setAttribute("position", {
          x: shift.x,
          y: shift.y,
          z: i + shift.z,
        });
        boxEl.setAttribute("scale", { x: 0.03, y: 0.03, z: 0.03 });
        scene.appendChild(boxEl);
        var textA = document.createElement("a-text");
        textA.setAttribute("text", { value: "" + i, color: "#969696" });
        textA.setAttribute("position", {
          x: shift.x + 0.1,
          y: shift.y + 0.2,
          z: i + shift.z,
        });
        scene.appendChild(textA);
        continue;
      }
      boxEl = document.createElement("a-sphere");
      boxEl.setAttribute("material", { color: "#ae63e4" });
      boxEl.setAttribute("position", {
        x: shift.x,
        y: shift.y,
        z: i + shift.z,
      });
      boxEl.setAttribute("scale", { x: 0.05, y: 0.05, z: 0.05 });
      scene.appendChild(boxEl);
      textA = document.createElement("a-text");
      textA.setAttribute("text", { value: "z=" + i, color: "#969696" });
      textA.setAttribute("position", {
        x: shift.x + 0.1,
        y: shift.y,
        z: i + shift.z,
      });
      scene.appendChild(textA);
      boxEl = document.createElement("a-sphere");
      boxEl.setAttribute("material", { color: "#ae63e4" });
      boxEl.setAttribute("position", {
        x: i + shift.x,
        y: shift.y,
        z: shift.z,
      });
      boxEl.setAttribute("scale", { x: 0.05, y: 0.05, z: 0.05 });
      scene.appendChild(boxEl);
      textA = document.createElement("a-text");
      textA.setAttribute("text", { value: "x=" + i, color: "#969696" });
      textA.setAttribute("position", {
        x: i + shift.x + 0.1,
        y: shift.y + 0.2,
        z: shift.z,
      });
      scene.appendChild(textA);
      boxEl = document.createElement("a-sphere");
      boxEl.setAttribute("material", { color: "#ae63e4" });
      boxEl.setAttribute("position", {
        x: shift.x,
        y: i + shift.y,
        z: shift.z,
      });
      boxEl.setAttribute("scale", { x: 0.05, y: 0.05, z: 0.05 });
      scene.appendChild(boxEl);
      textA = document.createElement("a-text");
      textA.setAttribute("text", { value: "y=" + i, color: "#969696" });
      textA.setAttribute("position", {
        x: shift.x + 0.1,
        y: i + shift.y,
        z: shift.z,
      });
      scene.appendChild(textA);
    }
    var lineX = document.createElement("a-entity");
    lineX.setAttribute("line", {
      start: shift.x + " " + shift.y + " " + shift.z,
      end: shift.x + " " + shift.y + " " + (i + shift.z),
      color: "#ae63e4",
    });
    scene.appendChild(lineX);
    var lineY = document.createElement("a-entity");
    lineY.setAttribute("line", {
      start: shift.x + " " + shift.y + " " + shift.z,
      end: i + shift.x + " " + shift.y + " " + shift.z,
      color: "#ae63e4",
    });
    scene.appendChild(lineY);
    var lineZ = document.createElement("a-entity");
    lineZ.setAttribute("line", {
      start: shift.x + " " + shift.y + " " + shift.z,
      end: shift.x + " " + (i + shift.y) + " " + shift.z,
      color: "#ae63e4",
    });
    scene.appendChild(lineZ);
  }
});
