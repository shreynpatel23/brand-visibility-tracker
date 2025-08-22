"use client";
import Loading from "@/components/loading";
import { fetchData } from "@/utils/fetch";
import { redirectToCurrentOnboardingStep } from "@/utils/mapCurrentOnboardingStep";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

export interface IUser {
  _id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
  verify_token?: string;
  verify_token_expire?: Date;
  number_of_retries?: number;
  reset_password_token?: string;
  reset_password_expire?: Date;
  plan_id: {
    _id: string;
    plan_id: string;
    plan_name: string;
  };
}

export const INITIAL_USER_STATE: IUser = {
  _id: "",
  full_name: "",
  email: "",
  is_verified: false,
  plan_id: {
    _id: "",
    plan_id: "",
    plan_name: "",
  },
};

const Context = createContext<{
  user: IUser;
  setUser: (user: IUser) => void;
  toggleFetchUserDetails: boolean;
  setToggleFetchUserDetails: (value: boolean) => void;
}>({
  user: INITIAL_USER_STATE,
  setUser: () => {},
  toggleFetchUserDetails: false,
  setToggleFetchUserDetails: () => {},
});

const authPathNames = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export function UserContext({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const userId =
    (typeof window !== "undefined" && localStorage.getItem("userId")) ?? "";
  const [user, setUser] = useState<IUser>(INITIAL_USER_STATE);
  const [toggleFetchUserDetails, setToggleFetchUserDetails] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>();

  useEffect(() => {
    async function getUserDetails(userId: string) {
      try {
        const response = await fetchData(`/api/users/${userId}`);
        const { data } = response;
        setUser(data);
        // utils for redirecting to the current onboarding step
        if (authPathNames.includes(pathname)) {
          return;
        }
        const url = redirectToCurrentOnboardingStep(
          data.current_onboarding_step,
          data
        );
        router.push(url);
      } catch (err: any) {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      setIsLoading(true);
      getUserDetails(userId);
    }

    return () => {
      setIsLoading(false);
    };
  }, [userId, toggleFetchUserDetails]);

  return (
    <Context.Provider
      value={{
        user,
        setUser,
        toggleFetchUserDetails,
        setToggleFetchUserDetails,
      }}
    >
      {isLoading ? (
        <div className="h-[100vh] w-[100vw] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loading message="Fetching user details. Please hang on a sec!" />
          </div>
        </div>
      ) : (
        children
      )}
    </Context.Provider>
  );
}

export function useUserContext() {
  return useContext(Context);
}
