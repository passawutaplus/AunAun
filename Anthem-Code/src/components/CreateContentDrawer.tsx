import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CreateContentDrawer = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    if (!user) {
      useAuthDialog.getState().openSignup("/portfolio/new");
      onOpenChange(false);
      return;
    }
    onOpenChange(false);
    navigate("/portfolio/new");
  }, [open, user, navigate, onOpenChange]);

  return null;
};

export default CreateContentDrawer;
