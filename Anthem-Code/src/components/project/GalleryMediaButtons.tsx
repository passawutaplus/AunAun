import { useRef } from "react";
import { Film, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryMediaButtonsProps {
  imageDisabled?: boolean;
  videoDisabled?: boolean;
  uploadingImage?: boolean;
  uploadingVideo?: boolean;
  onPickImages: (files: FileList) => void;
  onPickVideo: (file: File) => void;
}

export function GalleryMediaButtons({
  imageDisabled,
  videoDisabled,
  uploadingImage,
  uploadingVideo,
  onPickImages,
  onPickVideo,
}: GalleryMediaButtonsProps) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={imageDisabled || uploadingImage}
        onClick={() => imageRef.current?.click()}
      >
        {uploadingImage ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 mr-1" />
        )}
        เพิ่มภาพ
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={videoDisabled || uploadingVideo}
        onClick={() => videoRef.current?.click()}
      >
        {uploadingVideo ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Film className="w-4 h-4 mr-1" />
        )}
        เพิ่มวิดีโอ
      </Button>
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onPickImages(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickVideo(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
