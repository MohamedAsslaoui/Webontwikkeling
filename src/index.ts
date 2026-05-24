import "./sessionData";
import express from "express";
import path from "path";
import { Movie, Studio, User } from "./interfaces";
import { connectDatabase, moviesCollection, studiosCollection, usersCollection, createDefaultUsers } from "./database";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || "temporary_secret",
    resave: false,
    saveUninitialized: false
}));
app.use((req, res, next) => {
    res.locals.username = req.session.username;
    res.locals.role = req.session.role;

    next();
});

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

async function seedDatabase(): Promise<void> {
  const movieCount: number = await moviesCollection.countDocuments();
  const studioCount: number = await studiosCollection.countDocuments();

  if (movieCount === 0) {
    const movies: Movie[] = await getMovies();
    await moviesCollection.insertMany(movies);
    console.log("Movies toegevoegd aan MongoDB");
  }

  if (studioCount === 0) {
    const studios: Studio[] = await getStudios();
    await studiosCollection.insertMany(studios);
    console.log("Studios toegevoegd aan MongoDB");
  }
}

app.get("/", requireLogin, async (req, res) => {
    let movies: Movie[] = await moviesCollection.find().toArray();

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
        sortField: sortField,
        sortDirection: sortDirection
    });
});

app.get("/movies/:id", async (req, res) => {
    const movie: Movie | null = await moviesCollection.findOne({ id: req.params.id });

    if (!movie) {
        res.status(404).render("error", {
            message: "Movie not found"
        });
        return;
    }

    res.render("movie-detail", {
        movie: movie
    });
});

app.get("/studios", async (req, res) => {
    const studios: Studio[] = await studiosCollection.find().toArray();

    res.render("studios", {
        studios: studios
    });
});

app.get("/studios/:id", async (req, res) => {
    const studio: Studio | null = await studiosCollection.findOne({ id: req.params.id });
    const movies: Movie[] = await moviesCollection.find().toArray();

    if (!studio) {
        res.status(404).render("error", {
            message: "Studio not found"
        });
        return;
    }

    const studioMovies: Movie[] = movies.filter((movie) => movie.studio.id === studio.id);

    res.render("studio-detail", {
        studio: studio,
        movies: studioMovies
    });
});

app.get("/login", (req, res) => {
    if (req.session.username) {
        res.redirect("/");
        return;
    }

    res.render("login", {
        error: "",
        username: ""
    });
});

app.post("/login", async (req, res) => {
    if (req.session.username) {
    res.redirect("/");
    return;
    }

    const username: string = req.body.username;
    const password: string = req.body.password;

    const user: User | null = await usersCollection.findOne({
        username: username
    });

    if (!user) {
        res.render("login", {
            error: "Gebruiker niet gevonden",
            username: username
        });

        return;
    }

    const passwordCorrect: boolean = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordCorrect) {
        res.render("login", {
            error: "Fout wachtwoord",
            username: username
        });

        return;
    }

    req.session.username = user.username;
    req.session.role = user.role;

    res.redirect("/");
});

app.get("/register", (req, res) => {
    if (req.session.username) {
        res.redirect("/");
        return;
    }

    res.render("register", {
        error: "",
        username: ""
    });
});

app.post("/register", async (req, res) => {
    if (req.session.username) {
        res.redirect("/");
        return;
    }

    const username: string = req.body.username;
    const password: string = req.body.password;

    const existingUser: User | null = await usersCollection.findOne({
        username: username
    });

    if (existingUser) {
        res.render("register", {
            error: "Deze gebruikersnaam bestaat al",
            username: username
        });

        return;
    }

    const hashedPassword: string = await bcrypt.hash(password, 10);

    await usersCollection.insertOne({
        username: username,
        password: hashedPassword,
        role: "USER"
    });

    res.redirect("/login");
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

function requireLogin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.session.username) {
        next();
        return;
    }

    res.redirect("/login");
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!req.session.username) {
        res.redirect("/login");
        return;
    }

    if (req.session.role === "ADMIN") {
        next();
        return;
    }

    res.status(403).render("error", {
        message: "Je hebt geen toegang tot deze pagina"
    });
}

app.get("/movies/:id/edit", requireAdmin, async (req, res) => {
  const movie: Movie | null = await moviesCollection.findOne({ id: req.params.id });
  const studios: Studio[] = await studiosCollection.find().toArray();

  if (!movie) {
    res.status(404).render("error", {
        message: "Movie not found"
    });
    return;
  }

  res.render("movie-edit", {
    movie: movie,
    studios: studios
  });
});

app.post("/movies/:id/edit", requireAdmin, async (req, res) => {
  const studio: Studio | null = await studiosCollection.findOne({ id: req.body.studioId });

  if (!studio) {
    res.status(404).render("error", {
        message: "Studio not found"
    });
    return;
  }

  await moviesCollection.updateOne(
    { id: req.params.id },
    {
      $set: {
        title: req.body.title,
        genre: req.body.genre,
        duration: Number(req.body.duration),
        isAvailable: req.body.isAvailable === "true",
        studio: studio
      }
    }
  );

  res.redirect(`/movies/${req.params.id}`);
});

async function startServer(): Promise<void> {
    try {
        await connectDatabase();
        await createDefaultUsers();
        await seedDatabase();

        const port: number = Number(process.env.PORT) || 3001;

        app.listen(port, () => {
            console.log(`Server gestart op poort ${port}`);
        });
    } catch (error) {
        console.log(error);
    }
}

startServer();