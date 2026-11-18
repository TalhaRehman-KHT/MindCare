// Surface container. `hover` adds the shared lift-on-hover interaction.
export default function Card({ as: Tag = "div", hover = false, className = "", children, ...rest }) {
  return (
    <Tag className={`card ${hover ? "card-hover" : ""} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
