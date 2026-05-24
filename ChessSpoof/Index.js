const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8];
const IMAGE_PATH = "assets/PNGs/";

const board = document.getElementById("board");
const squaresById = {};
let pendingMove = null;

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

function movePieceToSquare(piece, newSquareId) {
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

function RookMove(currentSquare, piece) {
  const { row, col } = parseSquare(currentSquare);
  const squareIds = [];

  for (const squareId of Object.keys(squaresById)) {
    const { row: squareRow, col: squareCol } = parseSquare(squareId);
    if (squareRow === row || squareCol === col) {
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

class Rook {
  constructor() {
    this.name = "Rook";
    this.Function = RookMove;
    this.image = `${IMAGE_PATH}BlackRook.png`;
    this.CurrentSquare = "H8";
    this.value = 5;
    this.player = "Black";
  }
}

class Knight {
  constructor() {
    this.name = "Knight";
    this.Function = KnightMove;
    this.image = `${IMAGE_PATH}BlackKnight.png`;
    this.CurrentSquare = "F7";
    this.value = 3;
    this.player = "Black";
  }
}

const Players = ["White", "Black"];
const Pieces = [Rook, Knight].map((PieceClass) => new PieceClass());

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
      if (pendingMove) {
        if (square.classList.contains("move-target")) {
          movePieceToSquare(pendingMove.piece, squareId);
          clearMoveHighlights();
        } else {
          clearMoveHighlights();
        }
        return;
      }

      if (square.piece) {
        square.piece.Function(square.piece.CurrentSquare, square.piece);
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

for (const piece of Pieces) {
  const square = squaresById[piece.CurrentSquare];
  if (!square) {
    continue;
  }

  square.piece = piece;
  square.classList.add("occupied");
  square.textContent = "";

  const img = document.createElement("img");
  img.className = "piece";
  img.src = piece.image;
  img.alt = piece.name;
  square.appendChild(img);
}
