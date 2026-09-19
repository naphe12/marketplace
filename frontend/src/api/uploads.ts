import {
  apiRequest,
} from "./client";


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
  const prepared =
    await apiRequest<PrepareUploadResponse>(
      `/listings/${listingId}/images/prepare`,
      {
        method: "POST",
        authenticated: true,

        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
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
            file.type,
        },

        body: file,
      },
    );


  if (!uploadResponse.ok) {
    throw new Error(
      "Impossible d'envoyer la photo.",
    );
  }


  return apiRequest(
    `/listings/${listingId}/images/confirm`,
    {
      method: "POST",
      authenticated: true,

      body: JSON.stringify({
        object_key:
          prepared.object_key,

        content_type:
          file.type,

        size_bytes:
          file.size,

        position,

        is_primary:
          isPrimary,
      }),
    },
  );
}