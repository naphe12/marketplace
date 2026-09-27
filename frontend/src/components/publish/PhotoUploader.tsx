import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Star,
  Trash2,
} from "lucide-react";
import {
  useRef,
  useState,
} from "react";

import {
  apiRequest,
} from "../../api/client";
import {
  useI18n,
} from "../../i18n/I18nProvider";
import {
  uploadListingImage,
} from "../../api/uploads";
import type {
  ListingImage,
} from "../../types/listing";


type Props = {
  listingId: string;
  initialImages?: ListingImage[];
  onChange?: (images: ListingImage[]) => void;
};


export default function PhotoUploader({
  listingId,
  initialImages = [],
  onChange,
}: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [photos, setPhotos] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function orderedPhotos() {
    return [...photos].sort((a, b) => a.position - b.position);
  }

  function update(images: ListingImage[]) {
    setPhotos(images);
    onChange?.(images);
  }

  async function perform(action: () => Promise<void>) {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError(null);

    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("publish.photosError"),
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function add(files: File[]) {
    await perform(async () => {
      let current = orderedPhotos();

      for (const file of files.slice(0, 8 - current.length)) {
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(file.type) ||
          file.size > 8 * 1024 * 1024
        ) {
          throw new Error(
            t("publish.photosInvalid"),
          );
        }

        const photo = await uploadListingImage(
          listingId,
          file,
          current.length,
          current.length === 0,
        );

        current = [
          ...current,
          {
            ...photo,
            position: current.length,
            is_primary: current.length === 0,
          },
        ];

        update(current);
      }
    });
  }

  async function deleteImage(imageId: string) {
    await perform(async () => {
      await apiRequest(
        `/listings/${listingId}/images/${imageId}`,
        {
          method: "DELETE",
          authenticated: true,
        },
      );

      const deletedPhoto = photos.find(
        image => image.id === imageId,
      );

      const remaining = orderedPhotos()
        .filter(image => image.id !== imageId)
        .map((image, index) => ({
          ...image,
          position: index,
          is_primary: deletedPhoto?.is_primary
            ? index === 0
            : image.is_primary,
        }));

      update(remaining);
    });
  }

  async function makePrimary(imageId: string) {
    await perform(async () => {
      await apiRequest(
        `/listings/${listingId}/images/${imageId}/primary`,
        {
          method: "PATCH",
          authenticated: true,
        },
      );

      update(
        photos.map(image => ({
          ...image,
          is_primary: image.id === imageId,
        })),
      );
    });
  }

  async function saveOrder(reordered: ListingImage[]) {
    await perform(async () => {
      const normalized = reordered.map((image, index) => ({
        ...image,
        position: index,
      }));

      await apiRequest(
        `/listings/${listingId}/images/reorder`,
        {
          method: "PUT",
          authenticated: true,
          body: JSON.stringify({
            image_ids: normalized.map(
              image => image.id,
            ),
          }),
        },
      );

      update(normalized);
    });
  }

  async function moveImage(
    imageId: string,
    direction: -1 | 1,
  ) {
    const current = orderedPhotos();
    const index = current.findIndex(
      image => image.id === imageId,
    );
    const targetIndex = index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= current.length
    ) {
      return;
    }

    const reordered = [...current];
    [
      reordered[index],
      reordered[targetIndex],
    ] = [
      reordered[targetIndex],
      reordered[index],
    ];

    await saveOrder(reordered);
  }

  const sortedPhotos = orderedPhotos();

  return (
    <section className="publish-panel" aria-label={t("publish.photosAria")}>
      <div className="publish-panel__heading">
        <h2>{t("publish.photosTitle")}</h2>
        <p>
          {t("publish.photosText")}
        </p>
      </div>

      <input
        ref={inputRef}
        hidden
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={event => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void add(files);
        }}
      />

      <button
        type="button"
        className="photo-add-button"
        disabled={busy || photos.length >= 8}
        onClick={() => inputRef.current?.click()}
      >
        <Camera size={25} />
        <span>{t("publish.photosAdd")}</span>
      </button>

      {busy && (
        <p role="status">
          {t("publish.photosSaving")}
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="photo-grid">
        {sortedPhotos.map((photo, index) => (
          <article className="photo-card" key={photo.id}>
            <div className="photo-item">
              <img
                src={photo.thumbnail_url ?? photo.image_url}
                alt={`${t("publish.photoAlt")} ${index + 1}`}
              />

              <button
                type="button"
                className={
                  photo.is_primary
                    ? "photo-primary photo-primary--active"
                    : "photo-primary"
                }
                disabled={busy || photo.is_primary}
                onClick={() => void makePrimary(photo.id)}
              >
                <Star size={12} />
                <span>
                  {photo.is_primary
                    ? t("publish.photoPrimary")
                    : t("publish.photoSetPrimary")}
                </span>
              </button>
            </div>

            <div className="photo-actions">
              <button
                type="button"
                disabled={busy || index === 0}
                aria-label={`${t("publish.photoMoveLeft")} ${index + 1}`}
                onClick={() => void moveImage(photo.id, -1)}
              >
                <ArrowLeft size={16} />
              </button>

              <button
                type="button"
                disabled={busy || index === sortedPhotos.length - 1}
                aria-label={`${t("publish.photoMoveRight")} ${index + 1}`}
                onClick={() => void moveImage(photo.id, 1)}
              >
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="photo-action-danger"
                disabled={busy}
                aria-label={`${t("publish.photoDelete")} ${index + 1}`}
                onClick={() => void deleteImage(photo.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="photo-counter">
        {photos.length} / 8 {t("publish.photosCount")}
      </div>
    </section>
  );
}
