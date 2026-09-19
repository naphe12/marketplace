import json
import re
import sys
import uuid
from pathlib import Path


NAMESPACE = uuid.UUID(
    "21825e3e-06f2-4db5-8bb2-2a8019ac5a4c"
)


def stable_uuid(path: str) -> uuid.UUID:
    """
    Toujours le même UUID pour le même chemin administratif.
    """
    return uuid.uuid5(
        NAMESPACE,
        path.lower().strip(),
    )


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def slug(value: str) -> str:
    value = value.upper().strip()

    value = re.sub(
        r"[^A-Z0-9]+",
        "-",
        value,
    )

    return value.strip("-")


def insert_sql(
    *,
    id_: uuid.UUID,
    parent_id: uuid.UUID | None,
    name: str,
    area_type: str,
    code: str,
) -> str:

    parent_sql = (
        f"'{parent_id}'::uuid"
        if parent_id
        else "NULL"
    )

    return f"""
INSERT INTO market.administrative_areas (
    id,
    parent_id,
    name,
    area_type,
    code,
    latitude,
    longitude,
    active,
    created_at
)
VALUES (
    '{id_}'::uuid,
    {parent_sql},
    '{sql_escape(name)}',
    '{area_type}',
    '{sql_escape(code)}',
    NULL,
    NULL,
    TRUE,
    NOW()
)
ON CONFLICT (id)
DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    area_type = EXCLUDED.area_type,
    code = EXCLUDED.code,
    active = TRUE;
""".strip()


def generate(data: dict) -> str:

    sql: list[str] = []

    sql.append(
        """
-- ============================================================
-- Burundi administrative areas
-- Province -> Commune -> Zone -> Colline / Quartier
-- ============================================================

BEGIN;
"""
    )

    counts = {
        "PROVINCE": 0,
        "COMMUNE": 0,
        "ZONE": 0,
        "COLLINE": 0,
        "QUARTIER": 0,
    }

    for province in data["provinces"]:

        province_name = province["name"].strip()

        province_path = (
            f"BURUNDI/{province_name}"
        )

        province_id = stable_uuid(
            province_path
        )

        province_code = (
            f"BI-P-{slug(province_name)}"
        )

        sql.append(
            insert_sql(
                id_=province_id,
                parent_id=None,
                name=province_name.title(),
                area_type="PROVINCE",
                code=province_code,
            )
        )

        counts["PROVINCE"] += 1

        for commune in province["communes"]:

            commune_name = (
                commune["name"].strip()
            )

            commune_path = (
                f"{province_path}/"
                f"{commune_name}"
            )

            commune_id = stable_uuid(
                commune_path
            )

            commune_code = (
                f"{province_code}"
                f"-C-{slug(commune_name)}"
            )

            sql.append(
                insert_sql(
                    id_=commune_id,
                    parent_id=province_id,
                    name=commune_name,
                    area_type="COMMUNE",
                    code=commune_code,
                )
            )

            counts["COMMUNE"] += 1

            for zone in commune.get(
                "zones",
                [],
            ):

                zone_name = (
                    zone["name"].strip()
                )

                zone_path = (
                    f"{commune_path}/"
                    f"{zone_name}"
                )

                zone_id = stable_uuid(
                    zone_path
                )

                zone_code = (
                    f"{commune_code}"
                    f"-Z-{slug(zone_name)}"
                )

                sql.append(
                    insert_sql(
                        id_=zone_id,
                        parent_id=commune_id,
                        name=zone_name,
                        area_type="ZONE",
                        code=zone_code,
                    )
                )

                counts["ZONE"] += 1

                for locality in zone.get(
                    "collines_quarters",
                    [],
                ):

                    locality = (
                        locality.strip()
                    )

                    # Le jeu de données indique
                    # explicitement les quartiers
                    # avec le préfixe "Quartier ".
                    if locality.lower().startswith(
                        "quartier "
                    ):
                        area_type = "QUARTIER"

                        display_name = locality[
                            len("Quartier "):
                        ].strip()

                    else:
                        area_type = "COLLINE"
                        display_name = locality

                    locality_path = (
                        f"{zone_path}/"
                        f"{area_type}/"
                        f"{display_name}"
                    )

                    locality_id = stable_uuid(
                        locality_path
                    )

                    prefix = (
                        "Q"
                        if area_type == "QUARTIER"
                        else "CL"
                    )

                    locality_code = (
                        f"{zone_code}"
                        f"-{prefix}-"
                        f"{slug(display_name)}"
                    )

                    sql.append(
                        insert_sql(
                            id_=locality_id,
                            parent_id=zone_id,
                            name=display_name,
                            area_type=area_type,
                            code=locality_code,
                        )
                    )

                    counts[
                        area_type
                    ] += 1

    sql.append(
        """
COMMIT;

-- Vérification
SELECT
    area_type,
    COUNT(*) AS total
FROM market.administrative_areas
GROUP BY area_type
ORDER BY area_type;
"""
    )

    print(
        "Résumé du fichier généré :",
        file=sys.stderr,
    )

    for type_, count in counts.items():
        print(
            f"{type_:10s}: {count}",
            file=sys.stderr,
        )

    return "\n\n".join(sql)


def main():

    if len(sys.argv) != 3:
        print(
            "Usage: python "
            "generate_burundi_locations.py "
            "burundi-geo.json "
            "burundi_locations.sql"
        )

        raise SystemExit(1)

    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])

    with source.open(
        encoding="utf-8"
    ) as file:
        data = json.load(file)

    sql = generate(data)

    destination.write_text(
        sql,
        encoding="utf-8",
    )

    print(
        f"SQL créé : {destination}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()