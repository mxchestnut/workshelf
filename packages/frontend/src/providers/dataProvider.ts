/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataProvider } from 'react-admin';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const query = new URLSearchParams({
      _page: page.toString(),
      _limit: perPage.toString(),
      _sort: field,
      _order: order,
    });

    const url = `${apiUrl}/${resource}?${query}`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    return {
      data: json.data || [],
      total: json.total || 0,
    };
  },

  getOne: async (resource, params) => {
    const url = `${apiUrl}/${resource}/${params.id}`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return { data: json };
  },

  getMany: async (resource, params) => {
    const query = new URLSearchParams();
    params.ids.forEach((id) => query.append('id', id.toString()));

    const url = `${apiUrl}/${resource}?${query}`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return { data: json.data || [] };
  },

  getManyReference: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const query = new URLSearchParams({
      _page: page.toString(),
      _limit: perPage.toString(),
      _sort: field,
      _order: order,
      [params.target]: params.id.toString(),
    });

    const url = `${apiUrl}/${resource}?${query}`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    return {
      data: json.data || [],
      total: json.total || 0,
    };
  },

  create: async (resource, params) => {
    const response = await fetch(`${apiUrl}/${resource}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params.data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return { data: json };
  },

  update: async (resource, params) => {
    const response = await fetch(`${apiUrl}/${resource}/${params.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(params.data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return { data: json };
  },

  updateMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) =>
        fetch(`${apiUrl}/${resource}/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(params.data),
        })
      )
    );

    return { data: params.ids };
  },

  delete: async (resource, params) => {
    const response = await fetch(`${apiUrl}/${resource}/${params.id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return { data: json };
  },

  deleteMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) =>
        fetch(`${apiUrl}/${resource}/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        })
      )
    );

    return { data: params.ids };
  },
};
