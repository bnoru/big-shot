import Broker from './Broker.jsx';
import Cube from './Cube.jsx';

export default function AuctionSpace({ space, active, broker, onSelect }) {
  return (
    <button
      className={`auction-space${active ? ' auction-space--active' : ''}${broker ? ' auction-space--broker' : ''}`}
      style={{ gridArea: `${space.side}-${space.slot}` }}
      onClick={() => onSelect(space.id)}
      aria-label={`Espaço de leilão com ${space.cubes.length} cubos${broker ? ', corretor presente' : ''}`}
      title={broker ? 'Corretor neste espaço' : 'Espaço de leilão'}
      type="button"
    >
      <span className="auction-space__cubes" aria-hidden="true">
        {space.cubes.map((color, index) => (
          <Cube key={`${space.id}-${index}`} color={color} />
        ))}
      </span>
      {broker && <Broker />}
    </button>
  );
}
