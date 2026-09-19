import {
  useAuth,
} from "../auth/AuthContext";


export default function ProfilePage() {
  const {
    user,
    logout,
  } = useAuth();


  if (!user) {
    return (
      <div className="page">
        <h1>Profil</h1>

        <p>
          Vous n'êtes pas connecté.
        </p>
      </div>
    );
  }


  return (
    <div className="page">
      <h1>Mon profil</h1>

      <p>{user.phone}</p>

      {user.phone_verified && (
        <p>
          ✓ Téléphone vérifié
        </p>
      )}

      <button
        type="button"
        onClick={logout}
      >
        Se déconnecter
      </button>
    </div>
  );
}