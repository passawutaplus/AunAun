import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CommunityImageCropDialog } from "@/components/community/CommunityImageCropDialog";
import { AutoLoadPercentBar } from "@/components/project/LoadPercentBar";
import { useSubscription } from "@/core/subscription";
import { useUploadStageReporter } from "@/hooks/useUploadStageReporter";
import { uploadProjectImage, assertImageWithinUploadLimit, IMAGE_UPLOAD_MAX_INPUT_MB } from "@/lib/uploadImage";
import { UPLOAD_STAGE } from "@/lib/uploadProgress";
import { displayInitials } from "@/lib/avatarPool";
import { cvPortraitUrl } from "@/lib/profileCv";
import {
  isAllowedPortfolioStillImage,
  PORTFOLIO_STILL_IMAGE_ACCEPT,
} from "@/lib/normalizeImageUpload";
import { cn } from "@/lib/utils";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";

type Props = {
  userId: string;
  cvPhotoUrl?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  onChange?: (url: string) => void;
};

export default function CvPhotoEditor({
  userId,
  cvPhotoUrl,
  avatarUrl,
  displayName,
  username,
  onChange,
}: Props) {
  const { t } = useAboutEditLocale();
  const { tier } = useSubscription();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const { stage, reporter, resetStage } = useUploadStageReporter();
  const busy = !!stage;

  const preview = cvPortraitUrl(cvPhotoUrl, avatarUrl);
  const initials = displayInitials(username || displayName, 2);

  const persist = (url: string) => {
    onChange?.(url);
  };

  const saveCropped = async (file: File) => {
    reporter.onStage?.(UPLOAD_STAGE.compressingImage);
    try {
      assertImageWithinUploadLimit(file);
      const url = await uploadProjectImage(file, userId, "cv-photo", tier, {
        reporter,
      });
      persist(url);
      toast.success(t.photoAdded);
      setCropFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.uploadFailed);
    } finally {
      resetStage();
    }
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!isAllowedPortfolioStillImage(file)) {
      toast.error(t.photoWrongType);
      return;
    }
    try {
      assertImageWithinUploadLimit(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.fileTooLarge(IMAGE_UPLOAD_MAX_INPUT_MB));
      return;
    }
    setCropFile(file);
  };

  const removePhoto = () => {
    persist("");
  };

  return (
    <div className="flex items-start gap-4">
      <div
        className={cn(
          "relative h-36 w-36 shrink-0 overflow-hidden rounded-xl bg-secondary ring-1 ring-border",
          busy && "opacity-80",
        )}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-white text-2xl font-semibold">
            {initials}
          </div>
        )}
        {busy ? <div className="absolute inset-0 bg-background/45" aria-hidden /> : null}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="mr-1 h-3.5 w-3.5" />
            {cvPhotoUrl?.trim() ? t.photoChange : t.photoUpload}
          </Button>
          {cvPhotoUrl?.trim() ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full text-muted-foreground"
              disabled={busy}
              onClick={removePhoto}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {t.photoUseAvatar}
            </Button>
          ) : null}
        </div>
        {busy ? (
          <AutoLoadPercentBar
            percent={stage?.percent}
            label={stage?.label ?? t.photoUpload}
            showLabel
            className="max-w-[16rem]"
          />
        ) : (
          <p className="text-xs text-muted-foreground">{t.photoFormatHint}</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={PORTFOLIO_STILL_IMAGE_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <CommunityImageCropDialog
        file={cropFile}
        aspect="square"
        open={!!cropFile}
        onOpenChange={(open) => {
          if (!open) setCropFile(null);
        }}
        onConfirm={(file) => void saveCropped(file)}
        onCancel={() => setCropFile(null)}
        title={t.cropTitle}
        description={t.cropHint}
        zoomLabel={t.zoom}
        cancelLabel={t.cropCancel}
        confirmLabel={t.cropUse}
        confirmingLabel={t.cropping}
      />
    </div>
  );
}
