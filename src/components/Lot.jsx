export default function Lot({ lot, selected, state, placementMode, onSelect }) {
  const activate = () => onSelect(lot.id);
  const sold = Boolean(state?.sold);
  const full = (state?.cubes.length ?? 0) >= 7;

  return (
    <g
      className={`lot-hit lot-hit--${lot.district}${selected ? ' lot-hit--selected' : ''}${sold ? ' lot-hit--sold' : ''}${placementMode && !sold && !full ? ' lot-hit--placement' : ''}`}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
      role="button"
      tabIndex="0"
      aria-disabled={sold || full}
      aria-label={`${lot.multiplier ? 'Terreno multiplicador x2' : `Terreno de valor ${lot.value}`}${sold ? ', vendido' : ''}`}
    >
      <circle cx={lot.hit.x} cy={lot.hit.y} r={lot.hit.r} />
    </g>
  );
}
