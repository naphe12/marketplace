import {
  Camera,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

import {
  useRef,
  useState,
} from "react";

import {
  uploadListingImage,
} from "../../api/uploads";


type UploadedPhoto = {
  id?: string;

  previewUrl: string;
  objectKey?: string;

  uploading: boolean;

  isPrimary: boolean;
};


export default function PhotoUploader({
  listingId,
}: {
  listingId: string;
}) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [photos, setPhotos] =
    useState<UploadedPhoto[]>([]);


  async function handleFiles(
    files: FileList | null,
  ) {
    if (!files) {
      return;
    }

    const selected =
      Array.from(files).slice(
        0,
        8 - photos.length,
      );

    for (
      let index = 0;
      index < selected.length;
      index++
    ) {
      const file = selected[index];

      const previewUrl =
        URL.createObjectURL(file);

      const position =
        photos.length + index;

      const isPrimary =
        photos.length === 0 &&
        index === 0;

      setPhotos(current => [
        ...current,
        {
          previewUrl,
          uploading: true,
          isPrimary,
        },
      ]);

      try {
        const result =
          await uploadListingImage(
            listingId,
            file,
            position,
            isPrimary,
          );

        setPhotos(current =>
          current.map(photo =>
            photo.previewUrl === previewUrl
              ? {
                  ...photo,
                  uploading: false,
                  objectKey:
                    (
                      result as {
                        object_key?: string;
                      }
                    ).object_key,
                }
              : photo,
          ),
        );
      } catch {
        setPhotos(current =>
          current.filter(
            photo =>
              photo.previewUrl !==
              previewUrl,
          ),
        );
      }
    }
  }


  return (
    <section className="publish-panel">
      <div className="publish-panel__heading">
        <h1>
          Ajoutez des photos
        </h1>

        <p>
          Des photos nettes augmentent
          fortement la confiance des acheteurs.
        </p>
      </div>


      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={event =>
          handleFiles(
            event.target.files,
          )
        }
      />


      <button
        type="button"
        className="photo-add-button"
        onClick={() =>
          inputRef.current?.click()
        }
        disabled={photos.length >= 8}
      >
        <Camera size={25} />

        <div>
          <strong>
            Ajouter des photos
          </strong>

          <span>
            JPEG, PNG ou WebP · 8 MB max
          </span>
        </div>

        <Upload size={20} />
      </button>


      <div className="photo-grid">
        {photos.map(
          (photo, index) => (
            <div
              key={photo.previewUrl}
              className="photo-item"
            >
              <img
                src={photo.previewUrl}
                alt={`Photo ${index + 1}`}
              />

              {photo.uploading && (
                <div className="photo-uploading">
                  Envoi...
                </div>
              )}

              {photo.isPrimary && (
                <span className="photo-primary">
                  <Star size={12} />
                  Principale
                </span>
              )}

              <button
                type="button"
                className="photo-delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ),
        )}
      </div>


      <div className="photo-counter">
        {photos.length} / 8 photos
      </div>
    </section>
  );
}