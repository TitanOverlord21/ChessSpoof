const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8];

const board = document.getElementById("board");

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

    square.addEventListener("click", () => {
      square.classList.add("selected");
    });

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
