import type { ListingImage } from "../types/listing";
import {
  apiRequest,
} from "./client";
import {
  compressImageForUpload,
} from "../offline/images";


type PrepareUploadResponse = {
  upload_url: string;
  object_key: string;
  expires_in: number;
};


export async function uploadListingImage(
  listingId: string,
  file: File,
  position: number,
  isPrimary: boolean,
) {
  const uploadFile = await compressImageForUpload(file);

  const prepared =
    await apiRequest<PrepareUploadResponse>(
      `/listings/${listingId}/images/prepare`,
      {
        method: "POST",
        authenticated: true,

        body: JSON.stringify({
          filename: uploadFile.name,
          content_type: uploadFile.type,
          size_bytes: uploadFile.size,
        }),
      },
    );


  const uploadResponse =
    await fetch(
      prepared.upload_url,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            uploadFile.type,
        },

        body: uploadFile,
      },
    );


  if (!uploadResponse.ok) {
    throw new Error(
      "Impossible d'envoyer la photo.",
    );
  }


  return apiRequest<ListingImage>(
    `/listings/${listingId}/images/confirm`,
    {
      method: "POST",
      authenticated: true,

      body: JSON.stringify({
        object_key:
          prepared.object_key,

        content_type:
          uploadFile.type,

        size_bytes:
          uploadFile.size,

        position,

        is_primary:
          isPrimary,
      }),
    },
  );
}