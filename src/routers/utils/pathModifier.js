// Change all occurence of character '/' to '%'
const encode = (str) => {
    return str.replace(/\//g, '%');
};

// Change all occurence of character '%' to '/'
const decode = (str) => {
    return str.replace(/%/g, '/');
};

module.exports = {
    encode,
    decode
};