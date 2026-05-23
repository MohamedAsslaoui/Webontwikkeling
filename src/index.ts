import express from "express";
import path from "path";
import { Movie, Studio } from "./interfaces";

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({ extended: true }));

const moviesUrl: string = "https://raw.githubusercontent.com/MohamedAsslaoui/Webontwikkeling/main/data/movies.json";
const studiosUrl: string = "https://raw.githubusercontent.com/MohamedAsslaoui/Webontwikkeling/main/data/studios.json";

async function getMovies(): Promise<Movie[]> {
    const response = await fetch(moviesUrl);
    const movies: Movie[] = await response.json();
    return movies;
}

async function getStudios(): Promise<Studio[]> {
    const response = await fetch(studiosUrl);
    const studios: Studio[] = await response.json();
    return studios;
}

app.get("/", async (req, res) => {
    let movies: Movie[] = await getMovies();

    const search: string = req.query.search ? req.query.search.toString() : "";
    const sortField: string = req.query.sortField ? req.query.sortField.toString() : "title";
    const sortDirection: string = req.query.sortDirection ? req.query.sortDirection.toString() : "asc";

    if (search !== "") {
        movies = movies.filter((movie) =>
            movie.title.toLowerCase().includes(search.toLowerCase())
        );
    }

    movies = movies.sort((a: Movie, b: Movie) => {
        let valueA: string | number | boolean = a.title;
        let valueB: string | number | boolean = b.title;

        if (sortField === "releaseYear") {
            valueA = a.releaseDate.split("-")[0];
            valueB = b.releaseDate.split("-")[0];
        } else if (sortField === "genre") {
            valueA = a.genre;
            valueB = b.genre;
        } else if (sortField === "isAvailable") {
            valueA = a.isAvailable;
            valueB = b.isAvailable;
        } else if (sortField === "studio") {
            valueA = a.studio.name;
            valueB = b.studio.name;
        }

        if (valueA < valueB) {
            return sortDirection === "asc" ? -1 : 1;
        }

        if (valueA > valueB) {
            return sortDirection === "asc" ? 1 : -1;
        }

        return 0;
    });

    res.render("index", {
        movies: movies,
        search: search,
        sortDirection: sortDirection
    });
});

app.get("/movies/:id", async (req, res) => {
    const movies: Movie[] = await getMovies();
    const movie: Movie | undefined = movies.find((movie) => movie.id === req.params.id);

    if (!movie) {
        res.status(404).send("Movie not found");
        return;
    }

    res.render("movie-detail", {
        movie: movie
    });
});

app.get("/studios", async (req, res) => {
    const studios: Studio[] = await getStudios();

    res.render("studios", {
        studios: studios
    });
});

app.get("/studios/:id", async (req, res) => {
    const studios: Studio[] = await getStudios();
    const movies: Movie[] = await getMovies();

    const studio: Studio | undefined = studios.find((studio) => studio.id === req.params.id);

    if (!studio) {
        res.status(404).send("Studio not found");
        return;
    }

    const studioMovies: Movie[] = movies.filter((movie) => movie.studio.id === studio.id);

    res.render("studio-detail", {
        studio: studio,
        movies: studioMovies
    });
});

app.listen(3001, () => {
    console.log("Server gestart op http://localhost:3001");
});