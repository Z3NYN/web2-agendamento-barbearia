import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "neutro" | "perigo" | "fantasma";
  compacto?: boolean;
};

export default function Botao({
  variante = "primario",
  compacto = false,
  className = "",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`btn btn--${variante}${compacto ? " btn--compacto" : ""} ${className}`.trim()}
      {...props}
    />
  );
}
