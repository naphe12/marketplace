import type {
  ReactElement,
  ReactNode,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  useAuth,
} from "../auth/AuthContext";


type Props = {
  children: ReactNode;
};


export default function RequireAdmin({
  children,
}: Props): ReactElement {
  const {
    user,
    loading,
  } = useAuth();


  if (loading) {
    return (
      <div className="page">
        Chargement...
      </div>
    );
  }


  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  if (!user.is_admin) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  return (
    <>
      {children}
    </>
  );
}