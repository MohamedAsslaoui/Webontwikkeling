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
    releaseYear: number;
    isAvailable: boolean;
    releaseDate: string;
    imageUrl: string;
    genre: string;
    actors: string[];
    studio: Studio;
}