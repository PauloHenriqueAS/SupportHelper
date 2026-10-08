interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className }: Props) {
  return (
    <img
      className={className ? `logo ${className}` : "logo"}
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
