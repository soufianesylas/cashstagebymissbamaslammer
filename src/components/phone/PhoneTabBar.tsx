import { Home, Swords, Music, Users, Wallet } from "lucide-react";

interface Props {
  active: "home" | "battles" | "studio" | "collab" | "wallet";
  onChange: (v: Props["active"]) => void;
}

const items: { id: Props["active"]; label: string; Icon: typeof Home }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "battles", label: "Battles", Icon: Swords },
  { id: "studio", label: "Studio", Icon: Music },
  { id: "collab", label: "Collab", Icon: Users },
  { id: "wallet", label: "Wallet", Icon: Wallet },
];

const PhoneTabBar = ({ active, onChange }: Props) => (
  <div className="absolute bottom-0 inset-x-0 bg-background/90 backdrop-blur-xl border-t border-border px-2 py-2 flex justify-around">
    {items.map(({ id, label, Icon }) => {
      const isActive = active === id;
      return (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors"
        >
          <Icon
            className={`h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
            {label}
          </span>
        </button>
      );
    })}
  </div>
);

export default PhoneTabBar;
