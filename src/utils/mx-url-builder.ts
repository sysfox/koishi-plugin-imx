import { Context } from 'koishi'
import {
  CategoryModel,
  NoteModel,
  PageModel,
  PostModel,
} from '../types/mx-space/api'
import { getMxSpaceAggregateData, Config } from './mx-api'

async function buildUrlBase(ctx: Context, config: Config, path = '') {
  const aggregate = await getMxSpaceAggregateData(ctx, config)
  return new URL(path, aggregate?.url.webUrl).toString()
}

function isPostModel(model: any): model is PostModel {
  return (
    isDefined(model.title) && isDefined(model.slug) && !isDefined(model.order)
  )
}

function isPageModel(model: any): model is PageModel {
  return (
    isDefined(model.title) && isDefined(model.slug) && isDefined(model.order)
  )
}

function isNoteModel(model: any): model is NoteModel {
  return isDefined(model.title) && isDefined(model.nid)
}

function buildPath(model: PostModel | NoteModel | PageModel) {
  if (isPostModel(model)) {
    if (!model.category) {
      return '#'
    }
    return `/posts/${
      (model.category as CategoryModel).slug
    }/${encodeURIComponent(model.slug)}`
  } else if (isPageModel(model)) {
    return `/${model.slug}`
  } else if (isNoteModel(model)) {
    return `/notes/${model.nid}`
  }

  return '/'
}

function isDefined(data: any) {
  return data !== undefined && data !== null
}

export const urlBuilder = {
  build: async (
    ctx: Context,
    config: Config,
    model: Parameters<typeof buildPath>[0],
  ) => {
    return buildUrlBase(ctx, config, buildPath(model))
  },
}
