import { IUser } from "@/types";

export const isUserOwner = (user: IUser) => {
  return user.role === "owner";
};

export const isUserAdmin = (user: IUser) => {
  return user.role === "admin";
};

export const isUserViewer = (user: IUser) => {
  return user.role === "viewer";
};
