export interface Studio {
    id: string;
    name: string;
    foundedYear: number;
    isActive: boolean;
    headquarters: string;
    logoUrl: string;
}

export interface Movie {
    id: string;
    title: string;
    description: string;
    duration: number;
    isAvailable: boolean;
    releaseDate: string;
    imageUrl: string;
    genre: string;
    actors: string[];
    studio: Studio;
}

export interface User {
    username: string;
    password: string;
    role: "ADMIN" | "USER";
}