const generateSlug = (title, id, maxLength = 40) => {
    // Trim title to maxLength characters
    let trimmedTitle = title.slice(0, maxLength);

    // Convert title to lowercase, replace spaces and non-alphanumeric with hyphens
    const slugifiedTitle = trimmedTitle
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // Combine slugified title and id
    return `${slugifiedTitle}-${id}`;
}

export default generateSlug;