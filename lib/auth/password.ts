import argon2 from "argon2";

export const passwordPolicy = {
  minLength: 15,
  maxLength: 128,
} as const;

export const argon2idOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const dummyPasswordHash =
  "$argon2id$v=19$m=19456,p=1,t=2$ly1AOGJlS9H2AxZ3O85+Iw$VK9TPqkAWPMTsQkdd103eJGChHD2L4bkoa9UIz4ZuhA";

export function isPasswordLengthValid(password: string) {
  return (
    password.length >= passwordPolicy.minLength &&
    password.length <= passwordPolicy.maxLength
  );
}

export function hashPassword(password: string) {
  return argon2.hash(password, argon2idOptions);
}

export function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
