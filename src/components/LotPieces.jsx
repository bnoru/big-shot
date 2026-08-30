const POSITIONS = [
  [-27, 39], [-9, 39], [9, 39], [27, 39],
  [-18, 57], [0, 57], [18, 57],
];

export default function LotPieces({ lot, state }) {
  if (!state || (state.cubes.length === 0 && !state.sold)) return null;

  if (state.sold) {
    return (
      <g className="lot-pieces lot-pieces--sold" transform={`translate(${lot.anchor.x} ${lot.anchor.y})`}>
        <rect className="lot-sold-token" x="-31" y="40" width="62" height="24" rx="4" />
        <text className="lot-sold-label" x="0" y="56" textAnchor="middle">SOLD</text>
        {state.ownerId && (
          <rect
            className={`lot-cube-svg lot-cube-svg--${state.ownerId}`}
            x="21"
            y="43"
            width="16"
            height="16"
            rx="2"
          />
        )}
      </g>
    );
  }

  return (
    <g className="lot-pieces" transform={`translate(${lot.anchor.x} ${lot.anchor.y})`}>
      {state.cubes.map((color, index) => {
        const [x, y] = POSITIONS[index] ?? [0, 39];
        return (
          <rect
            key={`${lot.id}-${index}`}
            className={`lot-cube-svg lot-cube-svg--${color}`}
            x={x - 7}
            y={y - 7}
            width="14"
            height="14"
            rx="2"
          />
        );
      })}
    </g>
  );
}
