import { useNavigate } from "react-router-dom";

/** Single platform self-promo card — opens /advertise. */
const HouseAdCard = () => {
  const navigate = useNavigate();

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => navigate("/advertise")}
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-sm bg-muted text-left"
      >
        <img
          src="/ads/house-advertise.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      </button>
      <div className="mt-2 flex items-center gap-2 px-0.5">
        <button
          type="button"
          onClick={() => navigate("/advertise")}
          className="min-w-0 flex-1 truncate text-left text-base text-foreground thai-leading-tight hover:underline"
        >
          ลงโฆษณากับ Aplus1
        </button>
        <span
          className="shrink-0 rounded-full border border-foreground/15 bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground"
          aria-label="Sponsored"
        >
          Sponsored
        </span>
      </div>
    </div>
  );
};

export default HouseAdCard;
