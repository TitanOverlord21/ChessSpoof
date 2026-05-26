const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8];
const IMAGE_PATH = "assets/PNGs/";

const board = document.getElementById("board");
const squaresById = {};
let pendingMove = null;
let gameOver = false;
let inputsPaused = false;
let selectedSquare = null;
let audioUnlocked = false;

function getPlayerScore(player) {
  return Pieces.reduce((total, piece) => {
    if (piece.player === player) {
      return total + piece.value;
    }

    return total;
  }, 0);
}

function updateScoreDisplay() {
  for (const player of Players) {
    const scoreElement = document.getElementById(`score-${player.toLowerCase()}`);
    if (scoreElement) {
      scoreElement.textContent = String(getPlayerScore(player));
    }
  }
}

function checkForWinner() {
  if (gameOver) {
    return;
  }

  for (const player of Players) {
    if (getPlayerScore(player) <= 5) {
      const winner = Players.find((otherPlayer) => otherPlayer !== player);
      gameOver = true;
      alert(`${winner} wins!`);
      return;
    }
  }
}

function parseSquare(squareId) {
  return {
    row: squareId.charAt(0),
    col: Number(squareId.slice(1)),
  };
}

function clearMoveHighlights() {
  if (!pendingMove) {
    return;
  }

  for (const squareId of pendingMove.highlightedSquares) {
    squaresById[squareId].classList.remove("move-target");
  }

  pendingMove = null;
}

function clearSelection(playDeselectSound = false) {
  if (!selectedSquare) {
    return;
  }

  selectedSquare.classList.remove("selected");
  selectedSquare = null;

  if (playDeselectSound) {
    gameAudio.playDeselect();
  }
}

function unlockAudioOnce() {
  if (audioUnlocked) {
    gameAudio.ensureContext();
    return;
  }

  audioUnlocked = true;
  gameAudio.ensureContext();
}

function squareIdFromIndices(rowIndex, colIndex) {
  if (rowIndex < 0 || rowIndex >= ROWS.length || colIndex < 0 || colIndex >= COLS.length) {
    return null;
  }

  return `${ROWS[rowIndex]}${COLS[colIndex]}`;
}

function setMoveTargets(piece, squareIds) {
  clearMoveHighlights();

  const highlightedSquares = [];

  for (const squareId of squareIds) {
    if (!squaresById[squareId]) {
      continue;
    }

    squaresById[squareId].classList.add("move-target");
    highlightedSquares.push(squareId);
  }

  pendingMove = { piece, highlightedSquares };
}

function getDiagonalPath(fromSquareId, toSquareId) {
  const fromRowIndex = ROWS.indexOf(parseSquare(fromSquareId).row);
  const fromColIndex = COLS.indexOf(parseSquare(fromSquareId).col);
  const toRowIndex = ROWS.indexOf(parseSquare(toSquareId).row);
  const toColIndex = COLS.indexOf(parseSquare(toSquareId).col);
  const rowDelta = toRowIndex - fromRowIndex;
  const colDelta = toColIndex - fromColIndex;

  if (rowDelta === 0 || Math.abs(rowDelta) !== Math.abs(colDelta)) {
    return null;
  }

  const rowStep = rowDelta / Math.abs(rowDelta);
  const colStep = colDelta / Math.abs(colDelta);
  const path = [];
  const steps = Math.abs(rowDelta);

  for (let step = 1; step <= steps; step += 1) {
    const squareId = squareIdFromIndices(fromRowIndex + rowStep * step, fromColIndex + colStep * step);
    if (squareId) {
      path.push(squareId);
    }
  }

  return path;
}

function removePieceFromSquare(square) {
  if (!square || !square.piece) {
    return;
  }

  const capturedPiece = square.piece;
  const capturedImage = square.querySelector(".piece");
  if (capturedImage) {
    capturedImage.remove();
  }

  const pieceIndex = Pieces.indexOf(capturedPiece);
  if (pieceIndex !== -1) {
    Pieces.splice(pieceIndex, 1);
  }

  square.piece = null;
  square.classList.remove("occupied");
  square.textContent = square.id;
  updateScoreDisplay();
  checkForWinner();
}

function movePieceToSquare(piece, newSquareId) {
  const path =
    piece.name === "Knight" ? getDiagonalPath(piece.CurrentSquare, newSquareId) : null;

  if (path) {
    for (const squareId of path) {
      const square = squaresById[squareId];
      if (square.piece && square.piece !== piece) {
        removePieceFromSquare(square);
      }
    }
  } else {
    const destinationSquare = squaresById[newSquareId];
    if (destinationSquare.piece && destinationSquare.piece !== piece) {
      removePieceFromSquare(destinationSquare);
    }
  }

  const oldSquare = squaresById[piece.CurrentSquare];
  const newSquare = squaresById[newSquareId];
  const img = oldSquare.querySelector(".piece");

  oldSquare.piece = null;
  oldSquare.classList.remove("occupied");
  oldSquare.textContent = oldSquare.id;
  if (img) {
    img.remove();
  }

  newSquare.piece = piece;
  newSquare.classList.add("occupied");
  newSquare.textContent = "";
  if (img) {
    newSquare.appendChild(img);
  }

  piece.CurrentSquare = newSquareId;
}

function NoMove() {}

function collectRayTargets(rowIndex, colIndex, rowStep, colStep, piece) {
  const squareIds = [];
  let nextRowIndex = rowIndex + rowStep;
  let nextColIndex = colIndex + colStep;

  while (true) {
    const squareId = squareIdFromIndices(nextRowIndex, nextColIndex);
    if (!squareId) {
      break;
    }

    const square = squaresById[squareId];
    squareIds.push(squareId);
    if (square.piece) {
      break;
    }

    nextRowIndex += rowStep;
    nextColIndex += colStep;
  }

  return squareIds;
}

function RookMove(currentSquare, piece) {
  const { row, col } = parseSquare(currentSquare);
  const rowIndex = ROWS.indexOf(row);
  const colIndex = COLS.indexOf(col);
  const squareIds = [
    ...collectRayTargets(rowIndex, colIndex, 1, 0, piece),
    ...collectRayTargets(rowIndex, colIndex, -1, 0, piece),
    ...collectRayTargets(rowIndex, colIndex, 0, 1, piece),
    ...collectRayTargets(rowIndex, colIndex, 0, -1, piece),
  ];

  setMoveTargets(piece, squareIds);
}

function PawnMove(currentSquare, piece) {
  const { row, col } = parseSquare(currentSquare);
  const rowIndex = ROWS.indexOf(row);
  const colIndex = COLS.indexOf(col);
  const squareIds = [];
  const directions = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
    [2, 2],
    [2, -2],
    [-2, 2],
    [-2, -2],
  ];

  for (const [rowDelta, colDelta] of directions) {
    const squareId = squareIdFromIndices(rowIndex + rowDelta, colIndex + colDelta);
    if (squareId) {
      squareIds.push(squareId);
    }
  }

  setMoveTargets(piece, squareIds);
}

function BishopMove(currentSquare, piece) {
  const { row, col } = parseSquare(currentSquare);
  const rowIndex = ROWS.indexOf(row);
  const colIndex = COLS.indexOf(col);
  const squareIds = [];
  const directions = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (const [rowDelta, colDelta] of directions) {
    const squareId = squareIdFromIndices(rowIndex + rowDelta, colIndex + colDelta);
    if (squareId) {
      squareIds.push(squareId);
    }
  }

  setMoveTargets(piece, squareIds);
}

function KnightMove(currentSquare, piece) {
  const { row, col } = parseSquare(currentSquare);
  const rowIndex = ROWS.indexOf(row);
  const colIndex = COLS.indexOf(col);
  const squareIds = [];
  const directions = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (const [rowStep, colStep] of directions) {
    for (let distance = 1; distance <= 3; distance += 1) {
      const squareId = squareIdFromIndices(
        rowIndex + rowStep * distance,
        colIndex + colStep * distance,
      );

      if (!squareId) {
        break;
      }

      squareIds.push(squareId);
    }
  }

  setMoveTargets(piece, squareIds);
}

function QueenMove(currentSquare, piece) {
  const { row, col } = parseSquare(currentSquare);
  const rowIndex = ROWS.indexOf(row);
  const colIndex = COLS.indexOf(col);
  const squareIds = [];
  const borderDirections = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (const [rowDelta, colDelta] of borderDirections) {
    const squareId = squareIdFromIndices(rowIndex + rowDelta, colIndex + colDelta);
    if (squareId) {
      squareIds.push(squareId);
    }
  }

  const mirroredCol = 9 - col;
  const mirroredSquareId = `${row}${mirroredCol}`;
  if (mirroredSquareId !== currentSquare && squaresById[mirroredSquareId]) {
    squareIds.push(mirroredSquareId);
  }

  setMoveTargets(piece, squareIds);
}

function KingMove(currentSquare, piece) {
  const { row, col } = parseSquare(currentSquare);
  const rowIndex = ROWS.indexOf(row);
  const colIndex = COLS.indexOf(col);
  const borderDirections = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  const targetSquareIds = new Set();

  for (const [rowDelta, colDelta] of borderDirections) {
    const adjacentSquareId = squareIdFromIndices(rowIndex + rowDelta, colIndex + colDelta);
    if (!adjacentSquareId) {
      continue;
    }

    const adjacentSquare = squaresById[adjacentSquareId];
    if (!adjacentSquare.piece) {
      continue;
    }

    const { row: adjacentRow, col: adjacentCol } = parseSquare(adjacentSquareId);
    const adjacentRowIndex = ROWS.indexOf(adjacentRow);
    const adjacentColIndex = COLS.indexOf(adjacentCol);

    for (const [nearRowDelta, nearColDelta] of borderDirections) {
      const targetSquareId = squareIdFromIndices(
        adjacentRowIndex + nearRowDelta,
        adjacentColIndex + nearColDelta,
      );
      if (!targetSquareId || targetSquareId === currentSquare) {
        continue;
      }

      const targetSquare = squaresById[targetSquareId];
      if (targetSquare.piece && targetSquare.piece.player === piece.player) {
        continue;
      }

      targetSquareIds.add(targetSquareId);
    }
  }

  setMoveTargets(piece, [...targetSquareIds]);
}

class Pawn {
  constructor(player, startingSquare, imageFile) {
    this.name = "Pawn";
    this.Function = PawnMove;
    this.image = `${IMAGE_PATH}${imageFile}`;
    this.CurrentSquare = startingSquare;
    this.value = 1;
    this.player = player;
  }
}

class Rook {
  constructor(player, startingSquare, imageFile) {
    this.name = "Rook";
    this.Function = RookMove;
    this.image = `${IMAGE_PATH}${imageFile}`;
    this.CurrentSquare = startingSquare;
    this.value = 5;
    this.player = player;
  }
}

class Knight {
  constructor(player, startingSquare, imageFile) {
    this.name = "Knight";
    this.Function = KnightMove;
    this.image = `${IMAGE_PATH}${imageFile}`;
    this.CurrentSquare = startingSquare;
    this.value = 8;
    this.player = player;
  }
}

class Bishop {
  constructor(player, startingSquare, imageFile) {
    this.name = "Bishop";
    this.Function = BishopMove;
    this.image = `${IMAGE_PATH}${imageFile}`;
    this.CurrentSquare = startingSquare;
    this.value = 2;
    this.player = player;
  }
}

class Queen {
  constructor(player, startingSquare, imageFile) {
    this.name = "Queen";
    this.Function = QueenMove;
    this.image = `${IMAGE_PATH}${imageFile}`;
    this.CurrentSquare = startingSquare;
    this.value = 15;
    this.player = player;
  }
}

class King {
  constructor(player, startingSquare, imageFile) {
    this.name = "King";
    this.Function = KingMove;
    this.image = `${IMAGE_PATH}${imageFile}`;
    this.CurrentSquare = startingSquare;
    this.value = 12;
    this.player = player;
  }
}

const Players = ["White", "Black"];

const STARTING_SETUP = [
  ["Rook", "White", "A1", "WhiteRook.png"],
  ["Knight", "White", "A2", "WhiteKnight.png"],
  ["Knight", "White", "B2", "WhiteKnight.png"],
  ["Pawn", "White", "C2", "WhitePawn.png"],
  ["Pawn", "White", "B3", "WhitePawn.png"],
  ["Pawn", "White", "D1", "WhitePawn.png"],
  ["Pawn", "White", "A4", "WhitePawn.png"],
  ["Bishop", "White", "B1", "WhiteBishop.png"],
  ["Queen", "White", "C1", "WhiteQueen.png"],
  ["King", "White", "A3", "WhiteKing.png"],
  ["Rook", "Black", "H8", "BlackRook.png"],
  ["Knight", "Black", "H7", "BlackKnight.png"],
  ["Knight", "Black", "G7", "BlackKnight.png"],
  ["Pawn", "Black", "F7", "BlackPawn.png"],
  ["Pawn", "Black", "G6", "BlackPawn.png"],
  ["Pawn", "Black", "E8", "BlackPawn.png"],
  ["Pawn", "Black", "H5", "BlackPawn.png"],
  ["Bishop", "Black", "G8", "BlackBishop.png"],
  ["Queen", "Black", "F8", "BlackQueen.png"],
  ["King", "Black", "H6", "BlackKing.png"],
];

const PIECE_TYPES = { Pawn, Rook, Knight, Bishop, Queen, King };

function createStartingPieces() {
  return STARTING_SETUP.map(([pieceName, player, square, imageFile]) => {
    return new PIECE_TYPES[pieceName](player, square, imageFile);
  });
}

function placePieceOnSquare(piece) {
  const square = squaresById[piece.CurrentSquare];
  if (!square) {
    return;
  }

  square.piece = piece;
  square.classList.add("occupied");
  square.textContent = "";

  const img = document.createElement("img");
  img.className = piece.name === "Pawn" ? "piece pawn" : "piece";
  img.src = piece.image;
  img.alt = piece.name;
  square.appendChild(img);
}

function clearBoard() {
  for (const square of Object.values(squaresById)) {
    square.piece = null;
    square.classList.remove("occupied", "selected", "move-target");
    square.textContent = square.id;
    for (const pieceImage of square.querySelectorAll(".piece")) {
      pieceImage.remove();
    }
  }
}

function resetGame() {
  clearMoveHighlights();
  clearSelection(false);
  gameOver = false;
  clearBoard();
  Pieces.length = 0;
  Pieces.push(...createStartingPieces());

  for (const piece of Pieces) {
    placePieceOnSquare(piece);
  }

  updateScoreDisplay();
}

let Pieces = [];

for (let rowIndex = ROWS.length - 1; rowIndex >= 0; rowIndex -= 1) {
  const rowLabel = ROWS[rowIndex];

  const label = document.createElement("div");
  label.className = "row-label";
  label.textContent = rowLabel;
  label.style.gridColumn = "1";
  label.style.gridRow = String(ROWS.length - rowIndex);
  board.appendChild(label);

  for (let colIndex = 0; colIndex < COLS.length; colIndex += 1) {
    const colLabel = COLS[colIndex];
    const squareId = `${rowLabel}${colLabel}`;
    const isLight = (rowIndex + colIndex) % 2 === 0;

    const square = document.createElement("button");
    square.type = "button";
    square.className = `square ${isLight ? "light" : "dark"}`;
    square.id = squareId;
    square.dataset.position = squareId;
    square.setAttribute("aria-label", `Square ${squareId}`);
    square.textContent = squareId;
    square.style.gridColumn = String(colIndex + 2);
    square.style.gridRow = String(ROWS.length - rowIndex);
    square.piece = null;

    square.addEventListener("click", () => {
      if (inputsPaused || gameOver) {
        return;
      }

      unlockAudioOnce();

      if (pendingMove) {
        if (square.classList.contains("move-target")) {
          gameAudio.playSlide();
          movePieceToSquare(pendingMove.piece, squareId);
          clearMoveHighlights();
          clearSelection(false);
        } else {
          clearMoveHighlights();
          clearSelection(true);
        }
        return;
      }

      if (square.piece) {
        if (selectedSquare === square) {
          clearMoveHighlights();
          clearSelection(true);
          return;
        }

        clearMoveHighlights();
        clearSelection(false);
        selectedSquare = square;
        square.classList.add("selected");
        gameAudio.playSelect();
        square.piece.Function(square.piece.CurrentSquare, square.piece);
        return;
      }

      if (selectedSquare) {
        clearMoveHighlights();
        clearSelection(true);
      }
    });

    squaresById[squareId] = square;
    board.appendChild(square);
  }
}

for (let colIndex = 0; colIndex < COLS.length; colIndex += 1) {
  const label = document.createElement("div");
  label.className = "col-label";
  label.textContent = String(COLS[colIndex]);
  label.style.gridColumn = String(colIndex + 2);
  label.style.gridRow = String(ROWS.length + 1);
  board.appendChild(label);
}

const corner = document.createElement("div");
corner.className = "corner";
corner.style.gridColumn = "1";
corner.style.gridRow = String(ROWS.length + 1);
board.appendChild(corner);

Pieces.push(...createStartingPieces());
for (const piece of Pieces) {
  placePieceOnSquare(piece);
}

updateScoreDisplay();

function openSettings() {
  inputsPaused = true;
  clearMoveHighlights();
  clearSelection(false);
  document.body.classList.add("settings-open");
  settingsOverlay.hidden = false;
  settingsOverlay.setAttribute("aria-hidden", "false");
  settingsButton.setAttribute("aria-expanded", "true");
  settingsMainView.hidden = false;
  settingsVolumeView.hidden = true;
}

function closeSettings() {
  inputsPaused = false;
  document.body.classList.remove("settings-open");
  settingsOverlay.hidden = true;
  settingsOverlay.setAttribute("aria-hidden", "true");
  settingsButton.setAttribute("aria-expanded", "false");
}

function updateVolumeLabels() {
  volumeSfxValue.textContent = `${volumeSfxInput.value}%`;
  volumeMusicValue.textContent = `${volumeMusicInput.value}%`;
}

const settingsButton = document.getElementById("settings-button");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsMainView = document.getElementById("settings-main");
const settingsVolumeView = document.getElementById("settings-volume");
const settingsResetButton = document.getElementById("settings-reset");
const settingsVolumeOpenButton = document.getElementById("settings-volume-open");
const settingsVolumeBackButton = document.getElementById("settings-volume-back");
const settingsCloseButton = document.getElementById("settings-close");
const volumeSfxInput = document.getElementById("volume-sfx");
const volumeMusicInput = document.getElementById("volume-music");
const volumeSfxValue = document.getElementById("volume-sfx-value");
const volumeMusicValue = document.getElementById("volume-music-value");

const savedSfxVolume = localStorage.getItem("chessSpoofSfxVol");
const savedMusicVolume = localStorage.getItem("chessSpoofMusicVol");
if (savedSfxVolume !== null) {
  volumeSfxInput.value = savedSfxVolume;
}
if (savedMusicVolume !== null) {
  volumeMusicInput.value = savedMusicVolume;
}

gameAudio.setSfxVolume(Number(volumeSfxInput.value));
gameAudio.setMusicVolume(Number(volumeMusicInput.value));
updateVolumeLabels();

gameAudio.unlock();

settingsButton.addEventListener("click", () => {
  unlockAudioOnce();
  openSettings();
});

settingsCloseButton.addEventListener("click", closeSettings);

settingsOverlay.addEventListener("click", (event) => {
  if (event.target === settingsOverlay) {
    closeSettings();
  }
});

settingsResetButton.addEventListener("click", () => {
  resetGame();
  closeSettings();
});

settingsVolumeOpenButton.addEventListener("click", () => {
  settingsMainView.hidden = true;
  settingsVolumeView.hidden = false;
});

settingsVolumeBackButton.addEventListener("click", () => {
  settingsVolumeView.hidden = true;
  settingsMainView.hidden = false;
});

volumeSfxInput.addEventListener("input", () => {
  unlockAudioOnce();
  gameAudio.setSfxVolume(Number(volumeSfxInput.value));
  localStorage.setItem("chessSpoofSfxVol", volumeSfxInput.value);
  updateVolumeLabels();
});

volumeMusicInput.addEventListener("input", () => {
  unlockAudioOnce();
  gameAudio.setMusicVolume(Number(volumeMusicInput.value));
  localStorage.setItem("chessSpoofMusicVol", volumeMusicInput.value);
  updateVolumeLabels();
});

const rainbowSpeedSlider = document.getElementById("rainbow-speed");
if (rainbowSpeedSlider) {
  rainbowSpeedSlider.addEventListener("input", () => {
    const duration = Number(rainbowSpeedSlider.value);
    document.body.style.setProperty("--rainbow-spin-duration", `${duration}s`);
  });
}
