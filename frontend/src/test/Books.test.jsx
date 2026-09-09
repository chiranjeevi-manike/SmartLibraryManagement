import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import Books from "../pages/Books";

vi.mock("axios");

describe("Books", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    localStorage.setItem("token", "test-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: 1,
        username: "admin",
        role_id: 2,
      })
    );
  });

  test("loads books, authors and categories", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("/authors/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              name: "Abraham Silberschatz",
            },
          ],
        });
      }

      if (url.includes("/categories/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              name: "Database Systems",
            },
          ],
        });
      }

      if (url.includes("/books/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              title: "Database System Concepts",
              isbn: "9780073523323",
              author_id: 1,
              category_id: 1,
              total_copies: 5,
              available_copies: 5,
            },
          ],
        });
      }

      return Promise.reject(
        new Error(`Unexpected URL: ${url}`)
      );
    });


    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Books />
      </MemoryRouter>
    );

    expect(
      await screen.findByText("Database System Concepts")
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "+ Add Book",
      })
    );

    expect(
      screen.getByRole("option", {
        name: "Abraham Silberschatz",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: "Database Systems",
      })
    ).toBeInTheDocument();
  });
});