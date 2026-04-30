type SectionHeadingProps = {
  title: string;
  description?: string;
};

export function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
