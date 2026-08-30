export default function Cube({ color, small = false }) {
  return <span className={`cube cube--${color}${small ? ' cube--small' : ''}`} aria-label={`cubo ${color}`} />;
}
