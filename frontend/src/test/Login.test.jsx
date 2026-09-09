import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";
import axios from "axios";

import Login from "../pages/Login";

vi.mock("axios");

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={<div>Admin Dashboard Test</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test("displays the login form", () => {
    renderLogin();

    expect(
      screen.getByPlaceholderText("Enter your username")
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Enter your password")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Sign In" })
    ).toBeInTheDocument();
  });

  test("admin can log in and reach dashboard", async () => {
    axios.post.mockResolvedValue({
      data: { access_token: "test-token" },
    });

    axios.get.mockResolvedValue({
      data: {
        id: 1,
        username: "admin",
        role_id: 2,
      },
    });

    const user = userEvent.setup();

    renderLogin();

    await user.type(
      screen.getByPlaceholderText("Enter your username"),
      "admin"
    );

    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password"
    );

    await user.click(
      screen.getByRole("button", { name: "Sign In" })
    );

    expect(
      await screen.findByText("Admin Dashboard Test")
    ).toBeInTheDocument();

    expect(localStorage.getItem("token")).toBe(
      "test-token"
    );
  });
});