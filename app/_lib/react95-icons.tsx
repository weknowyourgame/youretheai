type IconProps = {
  variant?: string;
  className?: string;
};

function IconGlyph({
  className,
  glyph,
  label,
}: IconProps & { glyph: string; label: string }) {
  return (
    <span aria-label={label} className={className} role="img">
      {glyph}
    </span>
  );
}

export function Logo(props: IconProps) {
  return <IconGlyph {...props} glyph="▦" label="Start" />;
}

export function User2(props: IconProps) {
  return <IconGlyph {...props} glyph="i" label="Information" />;
}

export function User3(props: IconProps) {
  return <IconGlyph {...props} glyph="?" label="Question" />;
}

export function User4(props: IconProps) {
  return <IconGlyph {...props} glyph="!" label="Error" />;
}

export function User5(props: IconProps) {
  return <IconGlyph {...props} glyph="!" label="Warning" />;
}
