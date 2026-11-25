import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "neutro" | "perigo" };
export default function Botao({ variante = "primario", className = "", type = "button", ...props }: Props) {
  return <button type={type} className={`button button--${variante} ${className}`} {...props} />;
}
