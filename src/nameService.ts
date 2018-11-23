/**
 * nameService provides a service for customers to look up the ids
 * of service providers that provide the specific services.
 * Service provider need to register itself to the name service.
 * The service type is fixed and unique universally at this moment.
 */

import Base, { AccessRight, SubscriptionManagerImpl, ServiceType, ServiceInfo, GeneralService } from 'bitclave-base/';

const config = require('config');
const serviceTypes: Set<string> = new Set();
const nameServiceType: string = 'name_service';
const nameServiceDescription: string = 'provide service type look up service';

export class NameService {
    private base: Base;
    private accNameService: any;
    private service: any;
    private serviceInfo: any;
    constructor() {
        this.base = new Base(config.api.base, config.siteOrigin);
        serviceTypes.add('gpa');
    }

    /**
     * Register this nameService and announce service.
     */
    public async register() {
        console.log('nameService start');
        this.accNameService = await this.base.accountManager.authenticationByPassPhrase(config.pass, config.unique);
        console.log(`public key ${this.accNameService.publicKey}`);
        this.serviceInfo = new ServiceInfo(
            nameServiceType,
            this.accNameService.publicKey,
            nameServiceDescription,
            [SubscriptionManagerImpl.KEY_SERVICE_INFO]);
        this.service = new GeneralService(
            this.serviceInfo,
            this.base.profileManager,
            this.base.dataRequestManager);
        // announce service
        await this.base.subscriptionManager.announceService(this.service);
    }

    public async workingCycle() {
        const accNameService =
            await this.base.accountManager.authenticationByPassPhrase(
                config.pass, config.unique);

        const rawData: Map<string, string> =
            await this.base.profileManager.getData();

        // Task one: fulfill service type lookup requests from customers
        // and "service" entry lookup request from service provider
        const customerRequest = await this.base.dataRequestManager.getRequests(
            '', accNameService.publicKey);
        console.log(`service info & service type request length ${customerRequest.length}`);
        const grantFields: Map<string, AccessRight> = new Map();
        for (let i = 0; i < customerRequest.length; ++i) {
            const request = customerRequest[i];
            // Get the requested keys from a single client
            const requestKeys: Array<string> = await this.base.dataRequestManager.decryptMessage(
                request.fromPk,
                request.requestData);
            // Load all the previously granted permissions
            const keys: Array<string> = await this.base.dataRequestManager.getGrantedPermissionsToMe(request.fromPk);
            for (let j = 0; j < keys.length; ++j) {
                grantFields.set(keys[j], AccessRight.R);
            }
            for (let j = 0; j < requestKeys.length; ++j) {
                const key = requestKeys[j];
                // TODO: used a global unique list of service types
                if (!serviceTypes.has(key) && !rawData.has(key)) {
                    continue;
                }
                grantFields.set(key, AccessRight.R);
            }
            if (grantFields.size > 0) {
                await this.base.dataRequestManager.grantAccessForClient(
                    request.fromPk,
                    grantFields);
                grantFields.clear();
            }
        }
        // Task two: fulfill service registry requests from service provider
        const providerRequest = await this.base.dataRequestManager.getRequests(
            accNameService.publicKey, '');
        console.log(`service provider register request length ${providerRequest.length}`)
        const types: Map<string, ServiceType> = new Map();
        // Init in-memory data structure
        serviceTypes.forEach(type => {
            if (!rawData.has(type)) {
                types.set(type, new ServiceType(type));
            } else {
                const val: any = rawData.get(type);
                types.set(type, JSON.parse(val));
            }
        });
        // Process register requests from service provider
        for (let i = 0; i < providerRequest.length; ++i) {
            const request = providerRequest[i];
            const data: Map<string, string> = await this.base.profileManager.getAuthorizedData(
                request.toPk,
                request.responseData);
            if (!rawData.has(request.toPk) && data.has(SubscriptionManagerImpl.KEY_SERVICE_INFO)) {
                // Check if the service type is on the global type list
                const str: any = data.get(SubscriptionManagerImpl.KEY_SERVICE_INFO);
                const info: ServiceInfo = JSON.parse(str);
                if (!serviceTypes.has(info.type)) continue;
                this.service.addSubscriber(request.toPk);
                const entry: any = types.get(info.type);
                entry.spids.push(info.id);
            }
        }
        const updates: Map<string, string> = new Map();
        types.forEach((value: ServiceType, key: string) => {
            updates.set(key, JSON.stringify(value));
        });
        await this.base.profileManager.updateData(updates);
    }
}