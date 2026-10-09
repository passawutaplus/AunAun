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
        <span
          className="absolute right-2 top-2 rounded-full border border-black/10 bg-[#f5f5f5]/95 px-2 py-0.5 text-[10px] tracking-wider text-[#6b6762]"
          aria-label="Sponsored"
        >
          Sponsored
        </span>
      </button>
    </div>
  );
};

export default HouseAdCard;
