# Siswa PKL Absensi

Siswa PKL Absensi is a web-based attendance application that utilizes GPS lock radius and specific coordinates to ensure accurate location-based attendance tracking.

## Author

This project is developed by [zennmhtr](https://github.com/zennmhtr).

## Tech Stack

### Backend

-   Laravel 11
-   Inertia Server
-   FCM (Activate by user decision)

### Frontend & Tools

-   Inertia React TSX
-   ShadCN UI
-   React-Leaflet (Map)
-   Filepond
-   TailwindCSS 4

## Installation

Follow these steps to set up the project locally:

### Prerequisites

Ensure you have the following installed:

-   PHP >= 8.1
-   Composer
-   Node.js >= 18
-   NPM or Yarn
-   MySQL or any compatible database

### Steps

1. **Clone the Repository**

    ```bash
    git clone https://github.com/zennmhtr/attendance_intern_student.git
    cd attendance_intern_student/attendance_intern_student
    ```

2. **Install Backend Dependencies**

    ```bash
    composer install
    ```

3. **Set Up Environment Variables**
   Copy the `.env.example` file to `.env` and configure your database and other environment settings:

    ```bash
    cp .env.example .env
    php artisan key:generate
    ```

4. **Run Database Migrations**

    ```bash
    php artisan migrate
    ```

5. **Install Frontend Dependencies**

    ```bash
    npm install
    ```

6. **Build Frontend Assets**

    ```bash
    npm run dev
    ```

7. **Run the Development Server**

    ```bash
    php artisan serve
    ```

8. **Access the Application**
   Open your browser and navigate to `http://localhost:8000`.

## Features

-   GPS-based attendance tracking
-   Radius lock for location validation
-   Interactive map integration using React-Leaflet
