from app.models.base import Base, UUIDMixin


class AdministrativeArea(UUIDMixin, Base):
    """Map the identifier used by listings in the existing geographic table.

    Other geographic columns are intentionally not mapped here.
    """

    __tablename__ = "administrative_areas"
