# Octopus Agile Electricity Price Dashboard

[![Node.js CI](https://github.com/stuartb55/octopusagile/actions/workflows/build.yml/badge.svg)](https://github.com/stuartb55/octopusagile/actions/workflows/build.yml)

A Next.js application designed to display and analyse Octopus Agile electricity prices, providing users with real-time and historical insights into their energy costs.

## Overview

This dashboard fetches electricity pricing data from the Octopus Energy API, presenting it in an intuitive and interactive interface. It allows users to view current prices, upcoming price changes, and historical trends, helping them make informed decisions about their energy consumption.

## Key Features

* **Live Price Information**: Displays the current electricity price, the next price, and the cheapest upcoming price in the next 24 hours.
* **Today's Overview**: Provides a statistical summary of today's prices, including average, minimum, maximum, and price range.
* **Historical Analysis**: Allows users to view price data over selectable periods (1 day, 3 days, 1 week, 2 weeks, 1 month) with overall statistics for the chosen range.
* **Interactive Charts**: Visualises energy price trends over time using dynamic bar charts and area charts. Prices are colour-coded based on their value (Negative, Low, Medium, High).
* **Daily Breakdown**: Offers a detailed view of prices for specific days (Tomorrow, Today, Yesterday, etc.) with compact charts and key statistics.
* **Responsive Design**: User interface components adapt for optimal viewing on mobile devices.
* **Data Fetching**: Retrieves data from the Octopus Energy API with a fixed 30-minute revalidation period to ensure freshness.

## Tech Stack

* **Framework**: [Next.js](https://nextjs.org/) (Version 15.3.3)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **UI Library**: [React](https://reactjs.org/) (Version 19.1.0)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) with `tailwindcss-animate`.
* **Charting**: [Recharts](https://recharts.org/) (Version 2.15.3)
* **Icons**: [Lucide React](https://lucide.dev/)
* **UI Components**: Custom components built with [shadcn/ui](https://ui.shadcn.com/) principles (as indicated by `components.json` and structure).
* **Linting**: [ESLint](https://eslint.org/) with TypeScript support and Next.js recommended rules.
* **Package Manager**: Yarn (Version 4.9.1)
* **CI/CD**: GitHub Actions for continuous integration (linting and building on push/pull requests to `main`).
* **Font**: [Geist](https://vercel.com/font) (Sans and Mono)

## Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Prerequisites

* Node.js (Version 22.x recommended)
* Yarn (Version 4.x or as specified in `packageManager`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/stuartb55/octopusagile.git](https://github.com/stuartb55/octopusagile.git)
    cd octopusagile
    ```

2.  **Enable Corepack and set Yarn version:**
    ```bash
    corepack enable
    yarn set version stable
    ```
    (This step ensures you're using the project's specified Yarn version, as seen in the CI workflow).

3.  **Install dependencies:**
    ```bash
    yarn install
    ```


## Running the Project

### Development Server

To run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Linting

To lint the codebase:

Bash

```
yarn lint

```

### Building for Production

To build the project for production:

Bash

```
yarn build

```

### Starting the Production Server

After building, to start the production server:

Bash

```
yarn start

```

Deployment
----------

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_ca%3C11%3Empaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Learn More
----------

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://www.google.com/search?q=https://github.com/vercel/next.js%3C12%3E) - your feedback and contributions are welcome!

Contributing
------------

Contributions are welcome! If you have suggestions for improvements or bug fixes, please feel free to:

2.  Fork the repository.

4.  Create a new branch (`git checkout -b feature/your-feature-name`).

6.  Make your changes.

8.  Commit your changes (`git commit -m 'Add some feature'`).

10. Push to the branch (`git push origin feature/your-feature-name`).
11. Open a Pull Request.

Please ensure your code adheres to the existing linting rules.