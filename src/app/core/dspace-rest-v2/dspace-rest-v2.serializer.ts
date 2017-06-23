import { Serialize, Deserialize } from "cerialize";
import { Serializer } from "../serializer";
import { DSpaceRESTV2Response } from "./dspace-rest-v2-response.model";
import { DSpaceRESTv2Validator } from "./dspace-rest-v2.validator";
import { GenericConstructor } from "../shared/generic-constructor";
import { hasNoValue, hasValue } from "../../shared/empty.util";
import { EnvConfig, GLOBAL_CONFIG, GlobalConfig } from '../../../config';
import { Inject } from "@angular/core";

/**
 * This Serializer turns responses from v2 of DSpace's REST API
 * to models and vice versa
 */
export class DSpaceRESTv2Serializer<T> implements Serializer<T> {

  /**
   * Create a new DSpaceRESTv2Serializer instance
   *
   * @param modelType a class or interface to indicate
   * the kind of model this serializer should work with
   */
  constructor(
    private modelType: GenericConstructor<T>,
    private EnvConfig: GlobalConfig
  ) {
  }

  /**
   * Convert a model in to the format expected by the backend
   *
   * @param model The model to serialize
   * @returns An object to send to the backend
   */
  serialize(model: T): any {
    return Serialize(model, this.modelType);
  }

  /**
   * Convert an array of models in to the format expected by the backend
   *
   * @param models The array of models to serialize
   * @returns An object to send to the backend
   */
  serializeArray(models: Array<T>): any {
    return  Serialize(models, this.modelType);
  }

  /**
   * Convert a response from the backend in to a model.
   *
   * @param response An object returned by the backend
   * @returns a model of type T
   */
  deserialize(response: any): T {
    // TODO enable validation, once rest data stabilizes
    // new DSpaceRESTv2Validator(response).validate();
    if (Array.isArray(response)) {
      throw new Error('Expected a single model, use deserializeArray() instead');
    }
    let normalized = Object.assign({}, response, this.normalizeLinks(response._links));
    return <T> Deserialize(normalized, this.modelType);
  }

  /**
   * Convert a response from the backend in to an array of models
   *
   * @param response An object returned by the backend
   * @returns an array of models of type T
   */
  deserializeArray(response: any): Array<T> {
    //TODO enable validation, once rest data stabilizes
    // new DSpaceRESTv2Validator(response).validate();
    if (!Array.isArray(response)) {
      throw new Error('Expected an Array, use deserialize() instead');
    }
    let normalized = response.map((resource) => {
       return Object.assign({}, resource, this.normalizeLinks(resource._links));
    });

    return <Array<T>> Deserialize(normalized, this.modelType);
  }

  private normalizeLinks(links:any): any {
    let normalizedLinks = links;
    for (let link in normalizedLinks) {
      if (Array.isArray(normalizedLinks[link])) {
        normalizedLinks[link] = normalizedLinks[link].map(linkedResource => {
          return this.replaceProtocol(linkedResource.href);
        });
      }
      else {
        normalizedLinks[link] = this.replaceProtocol(normalizedLinks[link].href);
      }
    }
    return normalizedLinks;
  }

  private replaceProtocol(link:string):string {
    const baseUrl:string = EnvConfig.rest.baseUrl;
    const wrongBaseUrl:string = baseUrl.replace("https","http");
    return link.replace(wrongBaseUrl, baseUrl);
  }

}
